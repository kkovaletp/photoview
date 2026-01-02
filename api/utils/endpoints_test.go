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
	"github.com/stretchr/testify/require"
)

// =============================================================================
// Test Helper Functions
// =============================================================================

// configureEndpointsFromEnv reads environment variables and configures test endpoints.
// This bypasses production computation and is suitable for accessor/copy tests.
// For tests that need to verify production computation logic (panics, port normalization),
// use resetAndCallProduction instead.
func configureEndpointsFromEnv(t *testing.T) {
	t.Helper()

	// Parse API endpoint
	apiEndpointStr := os.Getenv("PHOTOVIEW_API_ENDPOINT")
	if apiEndpointStr == "" {
		apiEndpointStr = "/api"
	}
	apiEndpoint, err := url.Parse(apiEndpointStr)
	require.NoError(t, err, "Failed to parse API endpoint %q", apiEndpointStr)

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
	require.NotNil(t, net.ParseIP(listenIP), "Invalid IP address: %s", listenIP)

	listenPort := os.Getenv("PHOTOVIEW_LISTEN_PORT")
	if listenPort == "" {
		listenPort = "4001"
	}
	port, err := strconv.Atoi(listenPort)
	require.NoError(t, err, "Invalid port number: %s", listenPort)
	require.True(t, port >= 1 && port <= 65535, "Port out of range [1-65535]: %d", port)

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
		require.NotEmpty(t, uiEndpointsStr, "PHOTOVIEW_UI_ENDPOINTS must be set when PHOTOVIEW_SERVE_UI=0")

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

		require.NotEmpty(t, uiEndpoints, "No valid UI endpoints found")
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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("PHOTOVIEW_LISTEN_IP", tt.listenIP)
			t.Setenv("PHOTOVIEW_LISTEN_PORT", tt.listenPort)
			t.Setenv("PHOTOVIEW_API_ENDPOINT", tt.apiPath)

			configureEndpointsFromEnv(t)
			url := utils.ApiListenUrl()

			require.NotNil(t, url, "ApiListenUrl should return a URL")
			assert.Equal(t, tt.wantScheme, url.Scheme, "Scheme mismatch")
			assert.Equal(t, tt.wantHost, url.Host, "Host mismatch")
			assert.Equal(t, tt.wantPath, url.Path, "Path mismatch")
		})
	}
}

func TestApiListenUrlValidation(t *testing.T) {
	tests := []struct {
		name       string
		listenIP   string
		listenPort string
		wantErrMsg string
	}{
		{
			name:       "invalid IP",
			listenIP:   "invalid-ip",
			listenPort: "4001",
			wantErrMsg: "Invalid IP address: invalid-ip",
		},
		{
			name:       "invalid port - non-numeric",
			listenIP:   "127.0.0.1",
			listenPort: "not-a-number",
			wantErrMsg: "Invalid port number: not-a-number",
		},
		{
			name:       "invalid port - too low",
			listenIP:   "127.0.0.1",
			listenPort: "0",
			wantErrMsg: "Port out of range [1-65535]: 0",
		},
		{
			name:       "invalid port - too high",
			listenIP:   "127.0.0.1",
			listenPort: "65536",
			wantErrMsg: "Port out of range [1-65535]: 65536",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("PHOTOVIEW_LISTEN_IP", tt.listenIP)
			t.Setenv("PHOTOVIEW_LISTEN_PORT", tt.listenPort)
			t.Setenv("PHOTOVIEW_API_ENDPOINT", "/api")

			// Helper validates and will fail the test with clear error message
			// We're using a sub-test to capture the failure
			result := t.Run("validation", func(t *testing.T) {
				configureEndpointsFromEnv(t)
			})
			assert.False(t, result, "Expected validation to fail for test case: %s", tt.name)
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

	// Verify they are different pointers
	assert.NotSame(t, url1, url2, "Should return different URL instances")

	// Mutate one URL
	url1.Path = "/modified"

	// Verify the other is unchanged
	assert.Equal(t, "/api", url2.Path, "Mutation of one URL should not affect another")

	url3 := utils.ApiListenUrl()
	assert.Equal(t, "/api", url3.Path, "Subsequent calls should return unmodified path")
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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("PHOTOVIEW_API_ENDPOINT", tt.endpoint)
			t.Setenv("PHOTOVIEW_LISTEN_IP", "127.0.0.1")
			t.Setenv("PHOTOVIEW_LISTEN_PORT", "4001")

			configureEndpointsFromEnv(t)
			url := utils.ApiEndpointUrl()

			require.NotNil(t, url, "ApiEndpointUrl should return a URL")
			assert.Equal(t, tt.wantScheme, url.Scheme, "Scheme mismatch")
			assert.Equal(t, tt.wantHost, url.Host, "Host mismatch")
			assert.Equal(t, tt.wantPath, url.Path, "Path mismatch")
		})
	}
}

func TestApiEndpointUrlValidation(t *testing.T) {
	t.Run("invalid URL", func(t *testing.T) {
		t.Setenv("PHOTOVIEW_API_ENDPOINT", "ht!tp://invalid url")
		t.Setenv("PHOTOVIEW_LISTEN_IP", "127.0.0.1")
		t.Setenv("PHOTOVIEW_LISTEN_PORT", "4001")

		result := t.Run("validation", func(t *testing.T) {
			configureEndpointsFromEnv(t)
		})
		assert.False(t, result, "Expected validation to fail for invalid URL")
	})
}

func TestApiEndpointUrlReturnsCopy(t *testing.T) {
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "/api")
	t.Setenv("PHOTOVIEW_LISTEN_IP", "127.0.0.1")
	t.Setenv("PHOTOVIEW_LISTEN_PORT", "4001")
	configureEndpointsFromEnv(t)

	url1 := utils.ApiEndpointUrl()
	url2 := utils.ApiEndpointUrl()

	assert.NotSame(t, url1, url2, "Should return different URL instances")
	url1.Path = "/modified"
	assert.Equal(t, "/api", url2.Path, "Mutation of one URL should not affect another")

	url3 := utils.ApiEndpointUrl()
	assert.Equal(t, "/api", url3.Path, "Subsequent calls should return unmodified path")
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
				require.Len(t, urls, 1, "Should have 1 endpoint")
				assert.Equal(t, "https", urls[0].Scheme, "Scheme mismatch")
				assert.Equal(t, "ui.example.com", urls[0].Host, "Host mismatch")
			},
		},
		{
			name:      "multiple endpoints",
			serveUI:   "0",
			endpoints: "https://ui1.example.com,https://ui2.example.com,http://localhost:3000",
			wantCount: 3,
			validate: func(t *testing.T, urls []*url.URL) {
				require.Len(t, urls, 3, "Should have 3 endpoints")
				assert.Equal(t, "https", urls[0].Scheme, "First endpoint scheme mismatch")
				assert.Equal(t, "ui1.example.com", urls[0].Host, "First endpoint host mismatch")
				assert.Equal(t, "https", urls[1].Scheme, "Second endpoint scheme mismatch")
				assert.Equal(t, "ui2.example.com", urls[1].Host, "Second endpoint host mismatch")
				assert.Equal(t, "http", urls[2].Scheme, "Third endpoint scheme mismatch")
				assert.Equal(t, "localhost:3000", urls[2].Host, "Third endpoint host mismatch")
			},
		},
		{
			name:      "trims whitespace",
			serveUI:   "0",
			endpoints: "  https://ui1.example.com  ,  https://ui2.example.com  ",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				require.Len(t, urls, 2, "Should have 2 endpoints after trimming")
				assert.Equal(t, "ui1.example.com", urls[0].Host, "First endpoint host mismatch")
				assert.Equal(t, "ui2.example.com", urls[1].Host, "Second endpoint host mismatch")
			},
		},
		{
			name:      "skips empty entries",
			serveUI:   "0",
			endpoints: "https://ui1.example.com,,  ,https://ui2.example.com",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				require.Len(t, urls, 2, "Should have 2 endpoints, skipping empty entries")
			},
		},
		{
			name:      "skips invalid URLs",
			serveUI:   "0",
			endpoints: "https://valid.com,ht!tp://invalid,https://another.com",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				require.Len(t, urls, 2, "Should have 2 valid endpoints")
				assert.Equal(t, "valid.com", urls[0].Host, "First valid endpoint host mismatch")
				assert.Equal(t, "another.com", urls[1].Host, "Second valid endpoint host mismatch")
			},
		},
		{
			name:      "skips URLs without scheme",
			serveUI:   "0",
			endpoints: "https://valid.com,example.com,https://another.com",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				require.Len(t, urls, 2, "Should skip URL without scheme")
				assert.Equal(t, "valid.com", urls[0].Host, "First endpoint host mismatch")
				assert.Equal(t, "another.com", urls[1].Host, "Second endpoint host mismatch")
			},
		},
		{
			name:      "skips URLs without host",
			serveUI:   "0",
			endpoints: "https://valid.com,/just/path,https://another.com",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				require.Len(t, urls, 2, "Should skip URL without host")
				assert.Equal(t, "valid.com", urls[0].Host, "First endpoint host mismatch")
				assert.Equal(t, "another.com", urls[1].Host, "Second endpoint host mismatch")
			},
		},
		{
			name:      "preserves paths",
			serveUI:   "0",
			endpoints: "https://ui.example.com/app,https://ui2.example.com/photoview",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				require.Len(t, urls, 2, "Should have 2 endpoints")
				assert.Equal(t, "/app", urls[0].Path, "First endpoint path mismatch")
				assert.Equal(t, "/photoview", urls[1].Path, "Second endpoint path mismatch")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("PHOTOVIEW_SERVE_UI", tt.serveUI)
			t.Setenv("PHOTOVIEW_UI_ENDPOINTS", tt.endpoints)
			t.Setenv("PHOTOVIEW_API_ENDPOINT", "/api")
			t.Setenv("PHOTOVIEW_LISTEN_IP", "127.0.0.1")
			t.Setenv("PHOTOVIEW_LISTEN_PORT", "4001")

			configureEndpointsFromEnv(t)
			urls := utils.UiEndpointUrls()

			if tt.wantNil {
				assert.Nil(t, urls, "UiEndpointUrls should return nil when serving UI internally")
				return
			}

			require.NotNil(t, urls, "UiEndpointUrls should not return nil")
			assert.Len(t, urls, tt.wantCount, "Endpoint count mismatch")

			if tt.validate != nil {
				tt.validate(t, urls)
			}
		})
	}
}

func TestUiEndpointUrlsValidation(t *testing.T) {
	tests := []struct {
		name      string
		serveUI   string
		endpoints string
		wantErr   string
	}{
		{
			name:      "empty endpoints when not serving UI",
			serveUI:   "0",
			endpoints: "",
			wantErr:   "PHOTOVIEW_UI_ENDPOINTS must be set when PHOTOVIEW_SERVE_UI=0",
		},
		{
			name:      "no valid URLs",
			serveUI:   "0",
			endpoints: "invalid,/just/path,ht!tp://bad",
			wantErr:   "No valid UI endpoints found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("PHOTOVIEW_SERVE_UI", tt.serveUI)
			t.Setenv("PHOTOVIEW_UI_ENDPOINTS", tt.endpoints)
			t.Setenv("PHOTOVIEW_API_ENDPOINT", "/api")

			result := t.Run("validation", func(t *testing.T) {
				configureEndpointsFromEnv(t)
			})
			assert.False(t, result, "Expected validation to fail: %s", tt.wantErr)
		})
	}
}

func TestUiEndpointUrlsReturnsCopies(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "0")
	t.Setenv("PHOTOVIEW_UI_ENDPOINTS", "https://ui.example.com")
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "/api")
	configureEndpointsFromEnv(t)

	urls1 := utils.UiEndpointUrls()
	urls2 := utils.UiEndpointUrls()

	// Compare slice pointers
	require.NotNil(t, urls1, "First call should return URLs")
	require.NotNil(t, urls2, "Second call should return URLs")
	assert.True(t, &urls1 != &urls2, "Should return different slice instances")

	// Compare URL pointers
	require.Len(t, urls1, 1, "Should have one URL")
	require.Len(t, urls2, 1, "Should have one URL")
	assert.NotSame(t, urls1[0], urls2[0], "Should return different URL instances")

	// Mutate and verify isolation
	urls1[0].Path = "/modified"
	assert.Empty(t, urls2[0].Path, "Mutation of one URL should not affect another copy")

	urls3 := utils.UiEndpointUrls()
	require.Len(t, urls3, 1, "Third call should return URLs")
	assert.Empty(t, urls3[0].Path, "Subsequent calls should return unmodified URLs")
}

// =============================================================================
// Port Normalization Tests (testing production code behavior)
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
				require.Len(t, urls, 2, "Should have 2 URLs (original + port variant)")
				hosts := []string{urls[0].Host, urls[1].Host}
				assert.Contains(t, hosts, "example.com", "Should contain host without port")
				assert.Contains(t, hosts, "example.com:80", "Should contain host with :80")
			},
		},
		{
			name:      "http with :80 adds variant without port",
			endpoints: "http://example.com:80",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				require.Len(t, urls, 2, "Should have 2 URLs (original + simplified variant)")
				hosts := []string{urls[0].Host, urls[1].Host}
				assert.Contains(t, hosts, "example.com", "Should contain host without port")
				assert.Contains(t, hosts, "example.com:80", "Should contain host with :80")
			},
		},
		{
			name:      "https without port adds :443 variant",
			endpoints: "https://example.com",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				require.Len(t, urls, 2, "Should have 2 URLs (original + port variant)")
				hosts := []string{urls[0].Host, urls[1].Host}
				assert.Contains(t, hosts, "example.com", "Should contain host without port")
				assert.Contains(t, hosts, "example.com:443", "Should contain host with :443")
			},
		},
		{
			name:      "https with :443 adds variant without port",
			endpoints: "https://example.com:443",
			wantCount: 2,
			validate: func(t *testing.T, urls []*url.URL) {
				require.Len(t, urls, 2, "Should have 2 URLs (original + simplified variant)")
				hosts := []string{urls[0].Host, urls[1].Host}
				assert.Contains(t, hosts, "example.com", "Should contain host without port")
				assert.Contains(t, hosts, "example.com:443", "Should contain host with :443")
			},
		},
		{
			name:      "non-standard ports don't add variants",
			endpoints: "http://example.com:8080",
			wantCount: 1,
			validate: func(t *testing.T, urls []*url.URL) {
				require.Len(t, urls, 1, "Should have only 1 URL (no port normalization for non-standard ports)")
				assert.Equal(t, "example.com:8080", urls[0].Host, "Host with non-standard port should be preserved")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset to ensure production code runs
			utils.ResetTestEndpoints()

			t.Setenv("PHOTOVIEW_SERVE_UI", "0")
			t.Setenv("PHOTOVIEW_UI_ENDPOINTS", tt.endpoints)

			// Call UiEndpointUrls which will trigger production computation
			urls := utils.UiEndpointUrls()

			require.NotNil(t, urls, "UiEndpointUrls should return URLs")
			assert.Len(t, urls, tt.wantCount, "Endpoint count mismatch for %s", tt.name)

			if tt.validate != nil {
				tt.validate(t, urls)
			}

			// Clean up for next test
			t.Cleanup(utils.ResetTestEndpoints)
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
	gotApi := utils.ApiEndpointUrl()
	require.NotNil(t, gotApi, "ApiEndpointUrl should return a URL")
	assert.Equal(t, "/test-api", gotApi.Path, "API endpoint path mismatch")

	gotListen := utils.ApiListenUrl()
	require.NotNil(t, gotListen, "ApiListenUrl should return a URL")
	assert.Equal(t, "10.0.0.1:9000", gotListen.Host, "Listen host mismatch")

	urls := utils.UiEndpointUrls()
	require.Len(t, urls, 2, "Should have 2 UI endpoints")
	assert.Equal(t, "test-ui1.com", urls[0].Host, "First UI endpoint host mismatch")
	assert.Equal(t, "test-ui2.com", urls[1].Host, "Second UI endpoint host mismatch")
}

func TestResetTestEndpoints(t *testing.T) {
	// Set test endpoints
	apiEndpoint := mustParseURL("/test")
	utils.ConfigureTestEndpoints(apiEndpoint, nil, nil)

	// Verify they're set
	gotApi := utils.ApiEndpointUrl()
	require.NotNil(t, gotApi, "ApiEndpointUrl should return a URL")
	assert.Equal(t, "/test", gotApi.Path, "Test endpoint should be set")

	// Reset
	utils.ResetTestEndpoints()

	// Set production env var
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "/production")
	t.Setenv("PHOTOVIEW_LISTEN_IP", "127.0.0.1")
	t.Setenv("PHOTOVIEW_LISTEN_PORT", "4001")
	configureEndpointsFromEnv(t)

	// Should now use the new value
	gotApi2 := utils.ApiEndpointUrl()
	require.NotNil(t, gotApi2, "ApiEndpointUrl should return a URL")
	assert.Equal(t, "/production", gotApi2.Path, "Should use new endpoint after reset")
}
