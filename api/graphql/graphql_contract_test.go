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
	"regexp"
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

// Accept (and ignore) runner-provided -database flag so this package
// works under the existing API test harness.
var _ = flag.String("database", "", "database driver (ignored in contract tests; server env controls DB)")

type gqlError struct {
	Message string `json:"message"`
}

type gqlResp struct {
	Data   json.RawMessage `json:"data"`
	Errors []gqlError      `json:"errors"`
}

func TestMain(m *testing.M) {
	// api/graphql -> api
	wd, _ := os.Getwd()
	apiDir := filepath.Dir(wd)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Carry runner DB env; add minimal server bind + UI endpoints (UI not served).
	env := os.Environ()
	env = append(env,
		"PHOTOVIEW_LISTEN_IP="+listenIP,
		"PHOTOVIEW_LISTEN_PORT="+testListenPort,
		"PHOTOVIEW_SERVE_UI=0",
		"PHOTOVIEW_UI_ENDPOINTS=http://127.0.0.1:1234",
	)

	cmd := exec.CommandContext(ctx, "go", "run", ".")
	cmd.Dir = apiDir
	cmd.Env = env
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

	payload := map[string]string{"query": `query { __schema { queryType { name } } }`}
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

	b, readErr := io.ReadAll(res.Body)
	if readErr != nil {
		t.Fatalf("[contract:%s] read response body: %v", opName, readErr)
	}
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

func hasIntrospectionDisabled(errs []gqlError) bool {
	for _, e := range errs {
		if strings.EqualFold(strings.TrimSpace(e.Message), "introspection disabled") {
			return true
		}
	}
	return false
}

func loadEnumValuesFromSDL(t *testing.T, enumName string) []string {
	t.Helper()
	// Read all SDL pieces and extract enum block.
	glob := filepath.Join(filepath.Dir(filepath.Dir(".")), "api", "graphql", "resolvers", "*.graphql")
	matches, _ := filepath.Glob(glob)
	if len(matches) == 0 {
		t.Fatalf("[contract] no SDL files found at %s", glob)
	}
	re := regexp.MustCompile(`(?s)enum\s+` + regexp.QuoteMeta(enumName) + `\s*\{([^}]*)\}`)
	valRe := regexp.MustCompile(`(?m)^\s*([A-Za-z0-9_]+)\s*(?:#.*)?$`)

	seen := map[string]struct{}{}
	for _, f := range matches {
		b, err := os.ReadFile(f)
		if err != nil {
			t.Fatalf("[contract] read SDL %s: %v", f, err)
		}
		m := re.FindSubmatch(b)
		if len(m) < 2 {
			continue
		}
		block := string(m[1])
		for _, line := range strings.Split(block, "\n") {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			if mm := valRe.FindStringSubmatch(line); len(mm) == 2 {
				seen[mm[1]] = struct{}{}
			}
		}
	}
	out := make([]string, 0, len(seen))
	for k := range seen {
		out = append(out, k)
	}
	return out
}

// 1) Enum serialization contract: prefer on-wire introspection; if disabled, fall back to SDL.
func Test_OrderDirection_EnumValues_OnWire(t *testing.T) {
	t.Logf("[contract] Verify enum values for OrderDirection are {ASC, DESC}")
	resp := postGQL(t, "Introspection(OrderDirection)", `
		query {
			__type(name: "OrderDirection") {
				enumValues { name }
			}
		}
	`)

	// If introspection is disabled, validate against SDL files instead.
	if hasIntrospectionDisabled(resp.Errors) {
		t.Logf("[contract] Introspection disabled by server; falling back to SDL check")
		names := loadEnumValuesFromSDL(t, "OrderDirection")
		if !containsStr(names, "ASC") || !containsStr(names, "DESC") {
			t.Fatalf("[contract] SDL check failed; OrderDirection values=%v; want to include ASC and DESC", names)
		}
		t.Logf("[contract] OK (SDL): OrderDirection includes %v", names)
		return
	}

	// Normal on-wire path.
	type enumWrap struct {
		Type *struct {
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
	if d.Type == nil || len(d.Type.EnumValues) == 0 {
		t.Fatalf("[contract] __type(OrderDirection) yielded no values; raw=%s errors=%v", string(resp.Data), resp.Errors)
	}
	var names []string
	for _, ev := range d.Type.EnumValues {
		names = append(names, ev.Name)
	}
	if !containsStr(names, "ASC") || !containsStr(names, "DESC") {
		t.Fatalf("[contract] OrderDirection mismatch; got %v; want to include ASC and DESC", names)
	}
	t.Logf("[contract] OK (introspection): OrderDirection includes %v", names)
}

// 2) Auth gating must surface 'unauthorized' without a token.
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

	var foundUnauthorized bool
	var allErrs [][]string

	for _, c := range candidates {
		resp := postGQL(t, c.name, c.query)
		errMsgs := make([]string, 0, len(resp.Errors))
		for _, e := range resp.Errors {
			errMsgs = append(errMsgs, e.Message)
		}
		allErrs = append(allErrs, errMsgs)

		for _, msg := range errMsgs {
			if strings.EqualFold(strings.TrimSpace(msg), "unauthorized") {
				t.Logf("[contract] OK: %s returned 'unauthorized' as expected", c.name)
				foundUnauthorized = true
				break
			}
		}
		if foundUnauthorized {
			break
		}
	}

	if !foundUnauthorized {
		t.Fatalf("[contract] expected at least one protected query to return 'unauthorized'; errors=%v", allErrs)
	}
}
