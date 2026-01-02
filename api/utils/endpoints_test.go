package utils_test

import (
	"testing"

	"github.com/kkovaletp/photoview/api/utils"
	"github.com/stretchr/testify/assert"
)

// =============================================================================
// ApiListenUrl Tests - IP validation, port validation, defaults
// =============================================================================

func TestApiListenUrlDefaultValues(t *testing.T) {
	t.Setenv("PHOTOVIEW_LISTEN_IP", "")
	t.Setenv("PHOTOVIEW_LISTEN_PORT", "")
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "")

	url := utils.ApiListenUrl()
	assert.NotNil(t, url)
	assert.Equal(t, "http", url.Scheme)
	assert.Equal(t, "127.0.0.1:4001", url.Host)
	assert.Equal(t, "/api", url.Path)
}

func TestApiListenUrlCustomIPAndPort(t *testing.T) {
	t.Setenv("PHOTOVIEW_LISTEN_IP", "192.168.1.100")
	t.Setenv("PHOTOVIEW_LISTEN_PORT", "8080")
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "")

	url := utils.ApiListenUrl()
	assert.NotNil(t, url)
	assert.Equal(t, "http", url.Scheme)
	assert.Equal(t, "192.168.1.100:8080", url.Host)
	assert.Equal(t, "/api", url.Path)
}

func TestApiListenUrlIPv6Address(t *testing.T) {
	t.Setenv("PHOTOVIEW_LISTEN_IP", "::1")
	t.Setenv("PHOTOVIEW_LISTEN_PORT", "4001")
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "")

	url := utils.ApiListenUrl()
	assert.NotNil(t, url)
	assert.Equal(t, "http", url.Scheme)
	assert.Contains(t, url.Host, "::1")
	assert.Equal(t, "/api", url.Path)
}

func TestApiListenUrlCustomAPIPath(t *testing.T) {
	t.Setenv("PHOTOVIEW_LISTEN_IP", "")
	t.Setenv("PHOTOVIEW_LISTEN_PORT", "")
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "/custom")

	url := utils.ApiListenUrl()
	assert.NotNil(t, url)
	assert.Equal(t, "/custom", url.Path)
}

func TestApiListenUrlInvalidIPPanics(t *testing.T) {
	t.Setenv("PHOTOVIEW_LISTEN_IP", "invalid-ip")
	t.Setenv("PHOTOVIEW_LISTEN_PORT", "4001")

	assert.Panics(t, func() {
		utils.ApiListenUrl()
	}, "Should panic on invalid IP address")
}

func TestApiListenUrlInvalidPortPanics(t *testing.T) {
	t.Setenv("PHOTOVIEW_LISTEN_IP", "127.0.0.1")
	t.Setenv("PHOTOVIEW_LISTEN_PORT", "not-a-number")

	assert.Panics(t, func() {
		utils.ApiListenUrl()
	}, "Should panic on non-numeric port")
}

func TestApiListenUrlPortTooLowPanics(t *testing.T) {
	t.Setenv("PHOTOVIEW_LISTEN_IP", "127.0.0.1")
	t.Setenv("PHOTOVIEW_LISTEN_PORT", "0")

	assert.Panics(t, func() {
		utils.ApiListenUrl()
	}, "Should panic on port < 1")
}

func TestApiListenUrlPortTooHighPanics(t *testing.T) {
	t.Setenv("PHOTOVIEW_LISTEN_IP", "127.0.0.1")
	t.Setenv("PHOTOVIEW_LISTEN_PORT", "65536")

	assert.Panics(t, func() {
		utils.ApiListenUrl()
	}, "Should panic on port > 65535")
}

func TestApiListenUrlReturnsCopy(t *testing.T) {
	t.Setenv("PHOTOVIEW_LISTEN_IP", "127.0.0.1")
	t.Setenv("PHOTOVIEW_LISTEN_PORT", "4001")
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "/api")

	url1 := utils.ApiListenUrl()
	url2 := utils.ApiListenUrl()

	// Verify they are different pointers
	assert.NotSame(t, url1, url2, "Should return different URL instances")

	// Mutate one URL
	url1.Path = "/modified"

	// Verify the other is unchanged
	assert.Equal(t, "/api", url2.Path, "Mutation of one URL should not affect another")
}

// =============================================================================
// ApiEndpointUrl Tests - Path handling, defaults, URL parsing
// =============================================================================

func TestApiEndpointUrlDefaultValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "")

	url := utils.ApiEndpointUrl()
	assert.NotNil(t, url)
	assert.Equal(t, "/api", url.Path)
	assert.Empty(t, url.Scheme)
	assert.Empty(t, url.Host)
}

func TestApiEndpointUrlCustomRelativePath(t *testing.T) {
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "/custom/api")

	url := utils.ApiEndpointUrl()
	assert.NotNil(t, url)
	assert.Equal(t, "/custom/api", url.Path)
	assert.Empty(t, url.Scheme)
	assert.Empty(t, url.Host)
}

func TestApiEndpointUrlRelativePathWithoutLeadingSlash(t *testing.T) {
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "api")

	url := utils.ApiEndpointUrl()
	assert.NotNil(t, url)
	assert.Equal(t, "/api", url.Path, "Should add leading slash to relative path")
	assert.Empty(t, url.Scheme)
	assert.Empty(t, url.Host)
}

func TestApiEndpointUrlAbsoluteURLWithPath(t *testing.T) {
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "https://example.com/api")

	url := utils.ApiEndpointUrl()
	assert.NotNil(t, url)
	assert.Equal(t, "https", url.Scheme)
	assert.Equal(t, "example.com", url.Host)
	assert.Equal(t, "/api", url.Path)
}

func TestApiEndpointUrlAbsoluteURLWithoutPath(t *testing.T) {
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "https://example.com")

	url := utils.ApiEndpointUrl()
	assert.NotNil(t, url)
	assert.Equal(t, "https", url.Scheme)
	assert.Equal(t, "example.com", url.Host)
	assert.Equal(t, "/api", url.Path, "Should default to /api when path is empty")
}

func TestApiEndpointUrlAbsoluteURLWithPort(t *testing.T) {
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "http://example.com:8080/api")

	url := utils.ApiEndpointUrl()
	assert.NotNil(t, url)
	assert.Equal(t, "http", url.Scheme)
	assert.Equal(t, "example.com:8080", url.Host)
	assert.Equal(t, "/api", url.Path)
}

func TestApiEndpointUrlInvalidURLPanics(t *testing.T) {
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "ht!tp://invalid url")

	assert.Panics(t, func() {
		utils.ApiEndpointUrl()
	}, "Should panic on malformed URL")
}

func TestApiEndpointUrlReturnsCopy(t *testing.T) {
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "/api")

	url1 := utils.ApiEndpointUrl()
	url2 := utils.ApiEndpointUrl()

	// Verify they are different pointers
	assert.NotSame(t, url1, url2, "Should return different URL instances")

	// Mutate one URL
	url1.Path = "/modified"

	// Verify the other is unchanged
	assert.Equal(t, "/api", url2.Path, "Mutation of one URL should not affect another")

	// Verify subsequent calls still return correct path
	url3 := utils.ApiEndpointUrl()
	assert.Equal(t, "/api", url3.Path, "Cache should not be affected by mutations")
}

// =============================================================================
// UiEndpointUrls Tests - Multiple endpoints, validation, nil handling
// =============================================================================

func TestUiEndpointUrlsReturnsNilWhenServingUI(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "1")
	t.Setenv("PHOTOVIEW_UI_ENDPOINTS", "")

	urls := utils.UiEndpointUrls()
	assert.Nil(t, urls, "Should return nil when serving UI internally")
}

func TestUiEndpointUrlsSingleEndpoint(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "0")
	t.Setenv("PHOTOVIEW_UI_ENDPOINTS", "https://ui.example.com")

	urls := utils.UiEndpointUrls()
	assert.NotNil(t, urls)
	assert.Len(t, urls, 1)
	assert.Equal(t, "https", urls[0].Scheme)
	assert.Equal(t, "ui.example.com", urls[0].Host)
}

func TestUiEndpointUrlsMultipleEndpoints(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "0")
	t.Setenv("PHOTOVIEW_UI_ENDPOINTS", "https://ui1.example.com,https://ui2.example.com,http://localhost:3000")

	urls := utils.UiEndpointUrls()
	assert.NotNil(t, urls)
	assert.Len(t, urls, 3)

	assert.Equal(t, "https", urls[0].Scheme)
	assert.Equal(t, "ui1.example.com", urls[0].Host)

	assert.Equal(t, "https", urls[1].Scheme)
	assert.Equal(t, "ui2.example.com", urls[1].Host)

	assert.Equal(t, "http", urls[2].Scheme)
	assert.Equal(t, "localhost:3000", urls[2].Host)
}

func TestUiEndpointUrlsTrimsWhitespace(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "0")
	t.Setenv("PHOTOVIEW_UI_ENDPOINTS", "  https://ui1.example.com  ,  https://ui2.example.com  ")

	urls := utils.UiEndpointUrls()
	assert.NotNil(t, urls)
	assert.Len(t, urls, 2)
	assert.Equal(t, "ui1.example.com", urls[0].Host)
	assert.Equal(t, "ui2.example.com", urls[1].Host)
}

func TestUiEndpointUrlsSkipsEmptyEntries(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "0")
	t.Setenv("PHOTOVIEW_UI_ENDPOINTS", "https://ui1.example.com,,  ,https://ui2.example.com")

	urls := utils.UiEndpointUrls()
	assert.NotNil(t, urls)
	assert.Len(t, urls, 2, "Should skip empty entries")
}

func TestUiEndpointUrlsSkipsInvalidURLs(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "0")
	t.Setenv("PHOTOVIEW_UI_ENDPOINTS", "https://valid.com,ht!tp://invalid,https://another.com")

	urls := utils.UiEndpointUrls()
	assert.NotNil(t, urls)
	assert.Len(t, urls, 2, "Should skip malformed URLs but continue")
	assert.Equal(t, "valid.com", urls[0].Host)
	assert.Equal(t, "another.com", urls[1].Host)
}

func TestUiEndpointUrlsSkipsURLsWithoutScheme(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "0")
	t.Setenv("PHOTOVIEW_UI_ENDPOINTS", "https://valid.com,example.com,https://another.com")

	urls := utils.UiEndpointUrls()
	assert.NotNil(t, urls)
	assert.Len(t, urls, 2, "Should skip URLs without scheme")
	assert.Equal(t, "valid.com", urls[0].Host)
	assert.Equal(t, "another.com", urls[1].Host)
}

func TestUiEndpointUrlsSkipsURLsWithoutHost(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "0")
	t.Setenv("PHOTOVIEW_UI_ENDPOINTS", "https://valid.com,/just/path,https://another.com")

	urls := utils.UiEndpointUrls()
	assert.NotNil(t, urls)
	assert.Len(t, urls, 2, "Should skip URLs without host")
	assert.Equal(t, "valid.com", urls[0].Host)
	assert.Equal(t, "another.com", urls[1].Host)
}

func TestUiEndpointUrlsEmptyWhenNotServingUIPanics(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "0")
	t.Setenv("PHOTOVIEW_UI_ENDPOINTS", "")

	assert.Panics(t, func() {
		utils.UiEndpointUrls()
	}, "Should panic when PHOTOVIEW_SERVE_UI=0 and PHOTOVIEW_UI_ENDPOINTS is empty")
}

func TestUiEndpointUrlsNoValidURLsPanics(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "0")
	t.Setenv("PHOTOVIEW_UI_ENDPOINTS", "invalid,/just/path,ht!tp://bad")

	assert.Panics(t, func() {
		utils.UiEndpointUrls()
	}, "Should panic when no valid endpoints are found")
}

func TestUiEndpointUrlsReturnsCopies(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "0")
	t.Setenv("PHOTOVIEW_UI_ENDPOINTS", "https://ui.example.com")

	urls1 := utils.UiEndpointUrls()
	urls2 := utils.UiEndpointUrls()

	// Verify they are different slices
	assert.NotSame(t, urls1, urls2, "Should return different slice instances")

	// Verify URL pointers are different
	assert.NotSame(t, urls1[0], urls2[0], "Should return different URL instances")

	// Mutate one URL
	urls1[0].Path = "/modified"

	// Verify the other is unchanged
	assert.Empty(t, urls2[0].Path, "Mutation of one URL should not affect another")

	// Verify subsequent calls still return correct values
	urls3 := utils.UiEndpointUrls()
	assert.Empty(t, urls3[0].Path, "Cache should not be affected by mutations")
}

func TestUiEndpointUrlsWithPaths(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "0")
	t.Setenv("PHOTOVIEW_UI_ENDPOINTS", "https://ui.example.com/app,https://ui2.example.com/photoview")

	urls := utils.UiEndpointUrls()
	assert.NotNil(t, urls)
	assert.Len(t, urls, 2)
	assert.Equal(t, "/app", urls[0].Path)
	assert.Equal(t, "/photoview", urls[1].Path)
}

// =============================================================================
// Edge Cases and Integration Tests
// =============================================================================

func TestApiListenUrlUsesApiEndpointPath(t *testing.T) {
	t.Setenv("PHOTOVIEW_LISTEN_IP", "127.0.0.1")
	t.Setenv("PHOTOVIEW_LISTEN_PORT", "4001")
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "/custom/endpoint")

	listenUrl := utils.ApiListenUrl()
	apiUrl := utils.ApiEndpointUrl()

	assert.Equal(t, apiUrl.Path, listenUrl.Path, "ApiListenUrl should use path from ApiEndpointUrl")
}

func TestApiListenUrlWithAbsoluteApiEndpoint(t *testing.T) {
	t.Setenv("PHOTOVIEW_LISTEN_IP", "127.0.0.1")
	t.Setenv("PHOTOVIEW_LISTEN_PORT", "4001")
	t.Setenv("PHOTOVIEW_API_ENDPOINT", "https://external.com/api")

	listenUrl := utils.ApiListenUrl()
	assert.Equal(t, "/api", listenUrl.Path, "Should use path from absolute API endpoint")
	assert.Equal(t, "127.0.0.1:4001", listenUrl.Host, "Should use configured listen address")
}
