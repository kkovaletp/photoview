package utils_test

import (
	"fmt"
	"net"
	"net/url"
	"os"
	"strconv"
	"strings"
	"testing"

	"github.com/kkovaletp/photoview/api/utils"
	"github.com/stretchr/testify/assert"
)

// =============================================================================
// Test Helper Functions
// =============================================================================

// configureEndpointsFromEnv reads environment variables and configures test endpoints.
// This ensures tests use the test hook instead of relying on cached production values.
func configureEndpointsFromEnv(t *testing.T) {
	t.Helper()

	// Parse API endpoint
	apiEndpointStr := os.Getenv("PHOTOVIEW_API_ENDPOINT")
	if apiEndpointStr == "" {
		apiEndpointStr = "/api"
	}
	apiEndpoint, err := url.Parse(apiEndpointStr)
	if err != nil {
		t.Fatalf("Failed to parse API endpoint %q: %v", apiEndpointStr, err)
	}

	// Handle absolute URL without path - default to /api
	if apiEndpoint.Scheme != "" && apiEndpoint.Host != "" && apiEndpoint.Path == "" {
		apiEndpoint.Path = "/api"
	}
	// Handle relative path without leading slash
	if apiEndpoint.Scheme == "" && apiEndpoint.Host == "" && apiEndpoint.Path != "" && !strings.HasPrefix(apiEndpoint.Path, "/") {
		apiEndpoint.Path = "/" + apiEndpoint.Path
	}

	// Parse and validate API listen URL
	listenIP := os.Getenv("PHOTOVIEW_LISTEN_IP")
	if listenIP == "" {
		listenIP = "127.0.0.1"
	}
	if net.ParseIP(listenIP) == nil {
		t.Fatalf("Invalid IP address: %s", listenIP)
	}

	listenPort := os.Getenv("PHOTOVIEW_LISTEN_PORT")
	if listenPort == "" {
		listenPort = "4001"
	}
	port, err := strconv.Atoi(listenPort)
	if err != nil {
		t.Fatalf("Invalid port number: %s", listenPort)
	}
	if port < 1 || port > 65535 {
		t.Fatalf("Port out of range [1-65535]: %d", port)
	}

	listenURL := &url.URL{
		Scheme: "http",
		Host:   net.JoinHostPort(listenIP, listenPort),
		Path:   apiEndpoint.Path,
	}

	// Parse UI endpoints if not serving UI
	var uiEndpoints []*url.URL
	shouldServeUI := strings.ToLower(os.Getenv("PHOTOVIEW_SERVE_UI"))
	if shouldServeUI != "1" && shouldServeUI != "" {
		uiEndpointsStr := os.Getenv("PHOTOVIEW_UI_ENDPOINTS")
		if uiEndpointsStr == "" {
			t.Fatal("PHOTOVIEW_UI_ENDPOINTS must be set when PHOTOVIEW_SERVE_UI=0")
		}

		for _, urlStr := range strings.Split(uiEndpointsStr, ",") {
			urlStr = strings.TrimSpace(urlStr)
			if urlStr == "" {
				continue
			}
			parsedURL, err := url.Parse(urlStr)
			if err != nil {
				t.Logf("Skipping invalid URL: %s", urlStr)
				continue
			}
			if parsedURL.Scheme == "" || parsedURL.Host == "" {
				t.Logf("Skipping URL without scheme/host: %s", urlStr)
				continue
			}
			uiEndpoints = append(uiEndpoints, parsedURL)
		}

		if len(uiEndpoints) == 0 {
			t.Fatal("No valid UI endpoints found")
		}
	}

	utils.ConfigureTestEndpoints(apiEndpoint, listenURL, uiEndpoints)
	t.Cleanup(utils.ResetTestEndpoints)
}

// mustParseURL is a helper for constructing test URLs
func mustParseURL(rawURL string) *url.URL {
	u, err := url.Parse(rawURL)
	if err != nil {
		panic(fmt.Sprintf("Invalid test URL %q: %v", rawURL, err))
	}
	return u
}

// =============================================================================
// ApiListenUrl Tests
// =============================================================================

func TestApiListenUrl(t *testing.T) {
	tests := []struct {
		name       string
		listenIP   string
		listenPort string
		apiPath    string
		wantScheme string
		wantHost   string
		wantPath   string
		wantPanic  bool
	}{
		{
			name:       "default values",
			listenIP:   "",
			listenPort: "",
			apiPath:    "",
			wantScheme: "http",
			wantHost:   "127.0.0.1:4001",
			wantPath:   "/api",
		},
		{
			name:       "custom IP and port",
			listenIP:   "192.168.1.100",
			listenPort: "8080",
			apiPath:    "",
			wantScheme: "http",
			wantHost:   "192.168.1.100:8080",
			wantPath:   "/api",
		},
		{
			name:       "IPv6 address",
			listenIP:   "::1",
			listenPort: "4001",
			apiPath:    "",
			wantScheme: "http",
			wantHost:   "[::1]:4001",
			wantPath:   "/api",
		},
		{
			name:       "custom API path",
			listenIP:   "",
			listenPort: "",
			apiPath:    "/custom",
			wantScheme: "http",
			wantHost:   "127.0.0.1:4001",
			wantPath:   "/custom",
		},
		{
			name:       "invalid IP",
			listenIP:   "invalid-ip",
			listenPort: "4001",
			wantPanic:  true,
		},
		{
			name:       "invalid port - non-numeric",
			listenIP:   "127.0.0.1",
			listenPort: "not-a-number",
			wantPanic:  true,
		},
		{
			name:       "invalid port - too low",
			listenIP:   "127.0.0.1",
			listenPort: "0",
			wantPanic:  true,
		},
		{
			name:       "invalid port - too high",
			listenIP:   "127.0.0.1",
			listenPort: "65536",
			wantPanic:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("PHOTOVIEW_LISTEN_IP", tt.listenIP)
			t.Setenv("PHOTOVIEW_LISTEN_PORT", tt.listenPort)
			t.Setenv("PHOTOVIEW_API_ENDPOINT", tt.apiPath)

			if tt.wantPanic {
				assert.Panics(t, func() {
					configureEndpointsFromEnv(t)
				})
				return
			}

			configureEndpointsFromEnv(t)
			url := utils.ApiListenUrl()

			assert.NotNil(t, url)
			assert.Equal(t, tt.wantScheme, url.Scheme)
			assert.Equal(t, tt.wantHost, url.Host)
			assert.Equal(t, tt.wantPath, url.Path)
		})
	}
}

func TestApiListenUrlReturnsCopy(t *testing.T) {
	t.Setenv("PHOTOVIEW_LISTEN_IP", "127.0.0.1")
	t.Setenv("PHOTOVIEW_LISTEN_PORT", "4001")
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "/api")
	configureEndpointsFromEnv(t)

	url1 := utils.ApiListenUrl()
	url2 := utils.ApiListenUrl()

	assert.NotSame(t, url1, url2, "Should return different URL instances")
	url1.Path = "/modified"
	assert.Equal(t, "/api", url2.Path, "Mutation should not affect other copies")

	url3 := utils.ApiListenUrl()
	assert.Equal(t, "/api", url3.Path, "Subsequent calls should be unaffected")
}

// =============================================================================
// ApiEndpointUrl Tests
// =============================================================================

func TestApiEndpointUrl(t *testing.T) {
	tests := []struct {
		name       string
		endpoint   string
		wantScheme string
		wantHost   string
		wantPath   string
		wantPanic  bool
	}{
		{
			name:       "default value",
			endpoint:   "",
			wantScheme: "",
			wantHost:   "",
			wantPath:   "/api",
		},
		{
			name:       "custom relative path",
			endpoint:   "/custom/api",
			wantScheme: "",
			wantHost:   "",
			wantPath:   "/custom/api",
		},
		{
			name:       "relative path without leading slash",
			endpoint:   "api",
			wantScheme: "",
			wantHost:   "",
			wantPath:   "/api",
		},
		{
			name:       "absolute URL with path",
			endpoint:   "https://example.com/api",
			wantScheme: "https",
			wantHost:   "example.com",
			wantPath:   "/api",
		},
		{
			name:       "absolute URL without path defaults to /api",
			endpoint:   "https://example.com",
			wantScheme: "https",
			wantHost:   "example.com",
			wantPath:   "/api",
		},
		{
			name:       "absolute URL with port",
			endpoint:   "http://example.com:8080/api",
			wantScheme: "http",
			wantHost:   "example.com:8080",
			wantPath:   "/api",
		},
		{
			name:      "invalid URL",
			endpoint:  "ht!tp://invalid url",
			wantPanic: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("PHOTOVIEW_API_ENDPOINT", tt.endpoint)
			t.Setenv("PHOTOVIEW_LISTEN_IP", "127.0.0.1")
			t.Setenv("PHOTOVIEW_LISTEN_PORT", "4001")

			if tt.wantPanic {
				assert.Panics(t, func() {
					configureEndpointsFromEnv(t)
				})
				return
			}

			configureEndpointsFromEnv(t)
			url := utils.ApiEndpointUrl()

			assert.NotNil(t, url)
			assert.Equal(t, tt.wantScheme, url.Scheme)
			assert.Equal(t, tt.wantHost, url.Host)
			assert.Equal(t, tt.wantPath, url.Path)
		})
	}
}

func TestApiEndpointUrlReturnsCopy(t *testing.T) {
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "/api")
	configureEndpointsFromEnv(t)

	url1 := utils.ApiEndpointUrl()
	url2 := utils.ApiEndpointUrl()

	assert.NotSame(t, url1, url2, "Should return different URL instances")
	url1.Path = "/modified"
	assert.Equal(t, "/api", url2.Path, "Mutation should not affect other copies")

	url3 := utils.ApiEndpointUrl()
	assert.Equal(t, "/api", url3.Path, "Subsequent calls should be unaffected")
}

// =============================================================================
// UiEndpointUrls Tests
// =============================================================================

func TestUiEndpointUrls(t *testing.T) {
	tests := []struct {
		name      string
		serveUI   string
		endpoints string
		wantNil   bool
		wantCount int
		wantPanic bool
		validate  func(t *testing.T, urls []*url.URL)
	}{
		{
			name:      "returns nil when serving UI internally",
			serveUI:   "1",
			endpoints: "",
			wantNil:   true,
		},
		{
			name:      "single endpoint",
			serveUI:   "0",
			endpoints: "https://ui.example.com",
			wantCount: 1,
			validate: func(t *testing.T, urls []*url.URL) {
				assert.Equal(t, "https", urls[0].Scheme)
				assert.Equal(t, "ui.example.com", urls[0].Host)
			},
		},
		{
			name:      "multiple endpoints",
			serveUI:   "0",
			endpoints: "https://ui1.example.com,https://ui2.example.com,http://localhost:3000",
			wantCount: 3,
			validate: func(t *testing.T, urls []*url.URL) {
				assert.Equal(t, "https", urls[0].Scheme)
				assert.Equal(t, "ui1.example.com", urls[0].Host)
				assert.Equal(t, "https", urls[1].Scheme)
				assert.Equal(t, "ui2.example.com", urls[1].Host)
				assert.Equal(t, "http", urls[2].Scheme)
				assert.Equal(t, "localhost:3000", urls[2].Host)
			},
		},
		{
			name:      "trims whitespace",
			serveUI:   "0",
			endpoints: "  https://ui1.example.com  ,  https://ui2.example.com  ",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				assert.Equal(t, "ui1.example.com", urls[0].Host)
				assert.Equal(t, "ui2.example.com", urls[1].Host)
			},
		},
		{
			name:      "skips empty entries",
			serveUI:   "0",
			endpoints: "https://ui1.example.com,,  ,https://ui2.example.com",
			wantCount: 2,
		},
		{
			name:      "skips invalid URLs",
			serveUI:   "0",
			endpoints: "https://valid.com,ht!tp://invalid,https://another.com",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				assert.Equal(t, "valid.com", urls[0].Host)
				assert.Equal(t, "another.com", urls[1].Host)
			},
		},
		{
			name:      "skips URLs without scheme",
			serveUI:   "0",
			endpoints: "https://valid.com,example.com,https://another.com",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				assert.Equal(t, "valid.com", urls[0].Host)
				assert.Equal(t, "another.com", urls[1].Host)
			},
		},
		{
			name:      "skips URLs without host",
			serveUI:   "0",
			endpoints: "https://valid.com,/just/path,https://another.com",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				assert.Equal(t, "valid.com", urls[0].Host)
				assert.Equal(t, "another.com", urls[1].Host)
			},
		},
		{
			name:      "preserves paths",
			serveUI:   "0",
			endpoints: "https://ui.example.com/app,https://ui2.example.com/photoview",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				assert.Equal(t, "/app", urls[0].Path)
				assert.Equal(t, "/photoview", urls[1].Path)
			},
		},
		{
			name:      "empty endpoints when not serving UI panics",
			serveUI:   "0",
			endpoints: "",
			wantPanic: true,
		},
		{
			name:      "no valid URLs panics",
			serveUI:   "0",
			endpoints: "invalid,/just/path,ht!tp://bad",
			wantPanic: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("PHOTOVIEW_SERVE_UI", tt.serveUI)
			t.Setenv("PHOTOVIEW_UI_ENDPOINTS", tt.endpoints)
			t.Setenv("PHOTOVIEW_API_ENDPOINT", "/api")

			if tt.wantPanic {
				assert.Panics(t, func() {
					configureEndpointsFromEnv(t)
				})
				return
			}

			configureEndpointsFromEnv(t)
			urls := utils.UiEndpointUrls()

			if tt.wantNil {
				assert.Nil(t, urls)
				return
			}

			assert.NotNil(t, urls)
			assert.Len(t, urls, tt.wantCount)

			if tt.validate != nil {
				tt.validate(t, urls)
			}
		})
	}
}

func TestUiEndpointUrlsReturnsCopies(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "0")
	t.Setenv("PHOTOVIEW_UI_ENDPOINTS", "https://ui.example.com")
	configureEndpointsFromEnv(t)

	urls1 := utils.UiEndpointUrls()
	urls2 := utils.UiEndpointUrls()

	assert.NotSame(t, urls1, urls2, "Should return different slice instances")
	assert.NotSame(t, urls1[0], urls2[0], "Should return different URL instances")

	urls1[0].Path = "/modified"
	assert.Empty(t, urls2[0].Path, "Mutation should not affect other copies")

	urls3 := utils.UiEndpointUrls()
	assert.Empty(t, urls3[0].Path, "Subsequent calls should be unaffected")
}

// =============================================================================
// Port Normalization Tests (for UiEndpointUrls)
// =============================================================================

func TestUiEndpointUrlsPortNormalization(t *testing.T) {
	tests := []struct {
		name      string
		endpoints string
		wantCount int
		validate  func(t *testing.T, urls []*url.URL)
	}{
		{
			name:      "http without port adds :80 variant",
			endpoints: "http://example.com",
			wantCount: 2, // both http://example.com and http://example.com:80
			validate: func(t *testing.T, urls []*url.URL) {
				hosts := []string{urls[0].Host, urls[1].Host}
				assert.Contains(t, hosts, "example.com")
				assert.Contains(t, hosts, "example.com:80")
			},
		},
		{
			name:      "http with :80 adds variant without port",
			endpoints: "http://example.com:80",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				hosts := []string{urls[0].Host, urls[1].Host}
				assert.Contains(t, hosts, "example.com")
				assert.Contains(t, hosts, "example.com:80")
			},
		},
		{
			name:      "https without port adds :443 variant",
			endpoints: "https://example.com",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				hosts := []string{urls[0].Host, urls[1].Host}
				assert.Contains(t, hosts, "example.com")
				assert.Contains(t, hosts, "example.com:443")
			},
		},
		{
			name:      "https with :443 adds variant without port",
			endpoints: "https://example.com:443",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				hosts := []string{urls[0].Host, urls[1].Host}
				assert.Contains(t, hosts, "example.com")
				assert.Contains(t, hosts, "example.com:443")
			},
		},
		{
			name:      "non-standard ports don't add variants",
			endpoints: "http://example.com:8080",
			wantCount: 1,
			validate: func(t *testing.T, urls []*url.URL) {
				assert.Equal(t, "example.com:8080", urls[0].Host)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("PHOTOVIEW_SERVE_UI", "0")
			t.Setenv("PHOTOVIEW_UI_ENDPOINTS", tt.endpoints)
			configureEndpointsFromEnv(t)

			urls := utils.UiEndpointUrls()
			assert.Len(t, urls, tt.wantCount)

			if tt.validate != nil {
				tt.validate(t, urls)
			}
		})
	}
}

// =============================================================================
// Integration Tests
// =============================================================================

func TestApiListenUrlUsesApiEndpointPath(t *testing.T) {
	t.Setenv("PHOTOVIEW_LISTEN_IP", "127.0.0.1")
	t.Setenv("PHOTOVIEW_LISTEN_PORT", "4001")
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "/custom/endpoint")
	configureEndpointsFromEnv(t)

	listenUrl := utils.ApiListenUrl()
	apiUrl := utils.ApiEndpointUrl()

	assert.Equal(t, apiUrl.Path, listenUrl.Path, "ApiListenUrl should use path from ApiEndpointUrl")
}

func TestApiListenUrlWithAbsoluteApiEndpoint(t *testing.T) {
	t.Setenv("PHOTOVIEW_LISTEN_IP", "127.0.0.1")
	t.Setenv("PHOTOVIEW_LISTEN_PORT", "4001")
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "https://external.com/api")
	configureEndpointsFromEnv(t)

	listenUrl := utils.ApiListenUrl()
	assert.Equal(t, "/api", listenUrl.Path, "Should use path from absolute API endpoint")
	assert.Equal(t, "127.0.0.1:4001", listenUrl.Host, "Should use configured listen address")
}

// =============================================================================
// ConfigureTestEndpoints Direct Tests
// =============================================================================

func TestConfigureTestEndpointsDirectly(t *testing.T) {
	apiEndpoint := mustParseURL("/test-api")
	listenURL := mustParseURL("http://10.0.0.1:9000/test-api")
	uiEndpoints := []*url.URL{
		mustParseURL("https://test-ui1.com"),
		mustParseURL("https://test-ui2.com"),
	}

	utils.ConfigureTestEndpoints(apiEndpoint, listenURL, uiEndpoints)
	t.Cleanup(utils.ResetTestEndpoints)

	// Verify endpoints are set correctly
	assert.Equal(t, "/test-api", utils.ApiEndpointUrl().Path)
	assert.Equal(t, "10.0.0.1:9000", utils.ApiListenUrl().Host)

	urls := utils.UiEndpointUrls()
	assert.Len(t, urls, 2)
	assert.Equal(t, "test-ui1.com", urls[0].Host)
	assert.Equal(t, "test-ui2.com", urls[1].Host)
}

func TestResetTestEndpoints(t *testing.T) {
	// Set test endpoints
	apiEndpoint := mustParseURL("/test")
	utils.ConfigureTestEndpoints(apiEndpoint, nil, nil)

	// Verify they're set
	assert.Equal(t, "/test", utils.ApiEndpointUrl().Path)

	// Reset
	utils.ResetTestEndpoints()

	// Set production env var
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "/production")
	configureEndpointsFromEnv(t)

	// Should now use the new value
	assert.Equal(t, "/production", utils.ApiEndpointUrl().Path)
}
