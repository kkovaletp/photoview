package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

const (
	listenIP        = "127.0.0.1"
	testListenPort  = "4010" // isolated from defaults
	graphQLEndpoint = "http://" + listenIP + ":" + testListenPort + "/api/graphql"
	startupTimeout  = 60 * time.Second
	httpTimeout     = 15 * time.Second
)

// ---- Flag shim --------------------------------------------------------------
// Your CI runner passes -database=<driver> to all API test packages.
// Register it here so this package accepts (and ignores) it.
var (
	_ = flag.String("database", "", "database driver (ignored in contract tests; server env controls DB)")
)

// ---- Shared wire-format -----------------------------------------------------
type gqlResp struct {
	Data   json.RawMessage `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

// ---- Test bootstrap ---------------------------------------------------------
func TestMain(m *testing.M) {
	// Derive repo root from this file location.
	wd, _ := os.Getwd()
	// api/graphql -> api
	apiDir := filepath.Dir(wd)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Preserve caller env (DB settings come from CI), add minimal server bind conf.
	env := os.Environ()
	env = append(env,
		"PHOTOVIEW_LISTEN_IP="+listenIP,
		"PHOTOVIEW_LISTEN_PORT="+testListenPort,
		"PHOTOVIEW_SERVE_UI=0",
		// Required when PHOTOVIEW_SERVE_UI=0
		"PHOTOVIEW_UI_ENDPOINTS=http://127.0.0.1:1234",
	)

	cmd := exec.CommandContext(ctx, "go", "run", ".")
	cmd.Dir = apiDir
	cmd.Env = env
	// Stream server logs to stderr so they appear near test output.
	cmd.Stdout = os.Stderr
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "[contract] failed to start API server: %v\n", err)
		os.Exit(1)
	}

	if err := waitForGraphQLReady(startupTimeout); err != nil {
		_ = cmd.Process.Kill()
		fmt.Fprintf(os.Stderr, "[contract] GraphQL endpoint did not become ready: %v\n", err)
		os.Exit(1)
	}

	code := m.Run()

	_ = cmd.Process.Kill()
	os.Exit(code)
}

func waitForGraphQLReady(timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	client := &http.Client{Timeout: 3 * time.Second}

	payload := map[string]string{
		"query": `query { __schema { queryType { name } } }`,
	}
	body, _ := json.Marshal(payload)

	var lastStatus int
	var lastErr error
	for time.Now().Before(deadline) {
		req, _ := http.NewRequest(http.MethodPost, graphQLEndpoint, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		res, err := client.Do(req)
		if err == nil && res.StatusCode == http.StatusOK {
			_ = res.Body.Close()
			return nil
		}
		if res != nil {
			lastStatus = res.StatusCode
			_ = res.Body.Close()
		}
		lastErr = err
		time.Sleep(500 * time.Millisecond)
	}
	return fmt.Errorf("timeout waiting for %s (last http=%d, err=%v)", graphQLEndpoint, lastStatus, lastErr)
}

// ---- Helpers ----------------------------------------------------------------
func postGQL(t *testing.T, opName, query string) gqlResp {
	t.Helper()
	client := &http.Client{Timeout: httpTimeout}

	reqBody := map[string]string{"query": query}
	raw, _ := json.Marshal(reqBody)

	req, err := http.NewRequest(http.MethodPost, graphQLEndpoint, bytes.NewReader(raw))
	if err != nil {
		t.Fatalf("[contract:%s] build request: %v", opName, err)
	}
	req.Header.Set("Content-Type", "application/json")

	res, err := client.Do(req)
	if err != nil {
		t.Fatalf("[contract:%s] http post: %v", opName, err)
	}
	defer res.Body.Close()

	b, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("[contract:%s] unexpected HTTP status %d; body=%s", opName, res.StatusCode, string(b))
	}

	var out gqlResp
	if err := json.Unmarshal(b, &out); err != nil {
		t.Fatalf("[contract:%s] decode json: %v; body=%s", opName, err, string(b))
	}
	return out
}

func containsStr(xs []string, needle string) bool {
	for _, x := range xs {
		if x == needle {
			return true
		}
	}
	return false
}

// ---- Tests ------------------------------------------------------------------

// 1) Runtime enum serialization: OrderDirection must expose ASC/DESC on the wire.
func Test_OrderDirection_EnumValues_OnWire(t *testing.T) {
	t.Logf("[contract] Verify runtime enum serialization for OrderDirection == {ASC, DESC}")
	resp := postGQL(t, "Introspection(OrderDirection)", `
		query {
			__type(name: "OrderDirection") {
				enumValues { name }
			}
		}
	`)

	type enumWrap struct {
		Type struct {
			EnumValues []struct{ Name string } `json:"enumValues"`
		} `json:"__type"`
	}

	if len(resp.Data) == 0 {
		t.Fatalf("[contract] no data in response; errors=%v", resp.Errors)
	}

	var d enumWrap
	if err := json.Unmarshal(resp.Data, &d); err != nil {
		t.Fatalf("[contract] unmarshal data: %v; raw=%s", err, string(resp.Data))
	}

	if len(d.Type.EnumValues) == 0 {
		t.Fatalf("[contract] __type(OrderDirection) returned no enum values; raw=%s errors=%v", string(resp.Data), resp.Errors)
	}

	var names []string
	for _, ev := range d.Type.EnumValues {
		names = append(names, ev.Name)
	}

	// GraphQL introspection returns the schema enum names verbatim.
	// Our UI TS enum keys (Asc/Desc) serialize to 'ASC'/'DESC' on the wire, so this must match.
	if !containsStr(names, "ASC") || !containsStr(names, "DESC") {
		t.Fatalf("[contract] OrderDirection mismatch; got %v; want to include ASC and DESC", names)
	}

	t.Logf("[contract] OK: OrderDirection includes %v", names)
}

// 2) Auth gating: at least one protected query should return "unauthorized" without a token.
func Test_ProtectedQueries_Return_Unauthorized_WithoutToken(t *testing.T) {
	t.Logf("[contract] Verify protected queries return GraphQL error 'unauthorized' when no token present")

	candidates := []struct {
		name  string
		query string
	}{
		{"myUserPreferences", `query { myUserPreferences { language } }`},
		{"myAlbums", `query { myAlbums(limit: 1, offset: 0) { id } }`},
		{"myTimeline", `query { myTimeline(limit: 1, offset: 0) { id } }`},
		{"admin", `query { admin }`},
	}

	var matched bool
	var lastErrs []string

	for _, c := range candidates {
		resp := postGQL(t, c.name, c.query)
		errMsgs := make([]string, 0, len(resp.Errors))
		for _, e := range resp.Errors {
			errMsgs = append(errMsgs, e.Message)
		}
		lastErrs = errMsgs

		for _, msg := range errMsgs {
			if msg == "unauthorized" {
				t.Logf("[contract] OK: %s returned 'unauthorized' as expected", c.name)
				matched = true
				break
			}
			// If field doesn't exist on this schema, move on to next candidate.
			if strings.Contains(strings.ToLower(msg), "cannot query field") {
				break
			}
		}
		if matched {
			break
		}
	}

	if !matched {
		t.Fatalf("[contract] expected at least one protected query to return 'unauthorized'; last errors=%v", lastErrs)
	}
}
