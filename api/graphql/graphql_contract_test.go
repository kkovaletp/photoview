package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
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
	startupTimeout  = 45 * time.Second
	httpTimeout     = 15 * time.Second
)

type gqlResp struct {
	Data   json.RawMessage `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

func TestMain(m *testing.M) {
	// Derive repo root from this file location.
	wd, _ := os.Getwd()
	// api/contract -> api
	apiDir := filepath.Dir(wd)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Preserve caller env (DB settings come from CI), add minimal server bind conf.
	env := os.Environ()
	env = append(env,
		"PHOTOVIEW_LISTEN_IP="+listenIP,
		"PHOTOVIEW_LISTEN_PORT="+testListenPort,
		"PHOTOVIEW_SERVE_UI=0",
		"PHOTOVIEW_UI_ENDPOINTS=http://127.0.0.1:1234",
	)

	// Launch API server: go run . (in ./api)
	cmd := exec.CommandContext(ctx, "go", "run", ".")
	cmd.Dir = apiDir
	cmd.Env = env
	// Stream logs to help on CI failures.
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		panic("failed to start API server: " + err.Error())
	}

	// Wait for GraphQL to become ready.
	if err := waitForGraphQLReady(startupTimeout); err != nil {
		// Kill process then bail.
		_ = cmd.Process.Kill()
		panic("GraphQL endpoint did not become ready: " + err.Error())
	}

	// Run tests.
	code := m.Run()

	// Shutdown server.
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

	for time.Now().Before(deadline) {
		req, _ := http.NewRequest(http.MethodPost, graphQLEndpoint, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		res, err := client.Do(req)
		if err == nil && res.StatusCode == http.StatusOK {
			_ = res.Body.Close()
			return nil
		}
		if res != nil {
			_ = res.Body.Close()
		}
		time.Sleep(500 * time.Millisecond)
	}
	return errors.New("timeout")
}

func postGQL(t *testing.T, query string) gqlResp {
	t.Helper()
	client := &http.Client{Timeout: httpTimeout}

	reqBody := map[string]string{"query": query}
	raw, _ := json.Marshal(reqBody)

	req, err := http.NewRequest(http.MethodPost, graphQLEndpoint, bytes.NewReader(raw))
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	res, err := client.Do(req)
	if err != nil {
		t.Fatalf("http post: %v", err)
	}
	defer res.Body.Close()

	b, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("unexpected HTTP status %d; body=%s", res.StatusCode, string(b))
	}

	var out gqlResp
	if err := json.Unmarshal(b, &out); err != nil {
		t.Fatalf("decode json: %v; body=%s", err, string(b))
	}
	return out
}

// 1) Runtime enum serialization: OrderDirection must expose Asc/Desc over the wire.
func Test_OrderDirection_EnumValues(t *testing.T) {
	resp := postGQL(t, `
		query {
			__type(name: "OrderDirection") {
				enumValues { name }
			}
		}
	`)

	// Parse enum names.
	type enumWrap struct {
		Type struct {
			EnumValues []struct{ Name string } `json:"enumValues"`
		} `json:"__type"`
	}
	var d enumWrap
	if len(resp.Data) == 0 {
		t.Fatalf("no data in response; errors=%v", resp.Errors)
	}
	if err := json.Unmarshal(resp.Data, &d); err != nil {
		t.Fatalf("unmarshal data: %v", err)
	}
	names := make([]string, 0, len(d.Type.EnumValues))
	for _, ev := range d.Type.EnumValues {
		names = append(names, ev.Name)
	}
	got := strings.Join(names, ",")
	if !containsStr(names, "Asc") || !containsStr(names, "Desc") {
		t.Fatalf("OrderDirection values mismatch, got: [%s]; want to include Asc, Desc", got)
	}
}

// 2) Auth gating: at least one protected query should return "unauthorized" without a token.
func Test_Unauthorized_ProtectedQuery(t *testing.T) {
	// Candidate protected fields widely used by the UI; we’ll try them in order.
	candidates := []struct {
		name  string
		query string
	}{
		{"myUserPreferences", `query { myUserPreferences { language } }`},
		{"myAlbums", `query { myAlbums(limit: 1, offset: 0) { id } }`},
		{"myTimeline", `query { myTimeline(limit: 1, offset: 0) { id } }`},
		{"admin", `query { admin }`},
	}

	var unauthorizedOK bool
	var lastErrors []string

	for _, c := range candidates {
		resp := postGQL(t, c.query)

		// Collect error messages (if any).
		errMsgs := make([]string, 0, len(resp.Errors))
		for _, e := range resp.Errors {
			errMsgs = append(errMsgs, e.Message)
		}
		lastErrors = errMsgs

		// A protected resolver without token should yield a GraphQL error "unauthorized".
		for _, msg := range errMsgs {
			if msg == "unauthorized" {
				unauthorizedOK = true
				t.Logf("Protected query %q correctly returned 'unauthorized'", c.name)
				break
			}
			// If the field doesn’t exist on this schema, GraphQL returns
			// "Cannot query field ... on type Query"; move on to next candidate.
			if strings.Contains(strings.ToLower(msg), "cannot query field") {
				break
			}
		}
		if unauthorizedOK {
			break
		}
	}

	if !unauthorizedOK {
		t.Fatalf("expected at least one protected query to return 'unauthorized'; got errors=%v", lastErrors)
	}
}

func containsStr(xs []string, needle string) bool {
	for _, x := range xs {
		if x == needle {
			return true
		}
	}
	return false
}
