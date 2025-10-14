package server

import (
	"bufio"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"github.com/kkovaletp/photoview/api/test_utils"
	"github.com/stretchr/testify/assert"
)

func TestMain(m *testing.M) {
	test_utils.UnitTestRun(m)
}

// =============================================================================
// sanitizeURL Tests - SECURITY CRITICAL
// =============================================================================

func TestSanitizeURL_RedactsAccessToken(t *testing.T) {
	u, _ := url.Parse("https://example.com/api?access_token=secret123")
	result := sanitizeURL(u)
	assert.Contains(t, result, "%5BREDACTED%5D")
	assert.NotContains(t, result, "secret123")
}

func TestSanitizeURL_RedactsVariousSensitiveKeys(t *testing.T) {
	testCases := []struct {
		key string
	}{
		{"access_token"}, {"token"}, {"auth"}, {"authorization"},
		{"apikey"}, {"api_key"}, {"passwd"},
		{"secret"}, {"signature"}, {"session"}, {"jwt"}, {"code"},
	}

	for _, tc := range testCases {
		t.Run(tc.key, func(t *testing.T) {
			u, _ := url.Parse("https://example.com/api?" + tc.key + "=secret123")
			result := sanitizeURL(u)
			assert.Contains(t, result, "%5BREDACTED%5D")
			assert.NotContains(t, result, "secret123")
		})
	}
}

func TestSanitizeURL_CaseInsensitiveMatching(t *testing.T) {
	testCases := []string{
		"Access_Token",
		"ACCESS_TOKEN",
		"JWT",
		"Token",
	}

	for _, key := range testCases {
		t.Run(key, func(t *testing.T) {
			u, _ := url.Parse("https://example.com/api?" + key + "=secret123")
			result := sanitizeURL(u)
			assert.Contains(t, result, "%5BREDACTED%5D")
			assert.NotContains(t, result, "secret123")
		})
	}
}

func TestSanitizeURL_MultipleSensitiveParameters(t *testing.T) {
	u, _ := url.Parse("https://example.com/api?token=secret1&jwt=secret2&apikey=secret3")
	result := sanitizeURL(u)
	assert.NotContains(t, result, "secret1")
	assert.NotContains(t, result, "secret2")
	assert.NotContains(t, result, "secret3")
	// Should contain three URL-encoded [REDACTED] markers
	redactedCount := strings.Count(result, "%5BREDACTED%5D")
	assert.Equal(t, 3, redactedCount, "Expected exactly 3 URL-encoded [REDACTED] markers")
}

func TestSanitizeURL_MixedSensitiveAndNonSensitive(t *testing.T) {
	u, _ := url.Parse("https://example.com/api?id=123&token=secret&page=5")
	result := sanitizeURL(u)
	assert.Contains(t, result, "id=123")
	assert.Contains(t, result, "page=5")
	assert.Contains(t, result, "%5BREDACTED%5D")
	assert.NotContains(t, result, "secret")
}

func TestSanitizeURL_RepeatedSensitiveParameters(t *testing.T) {
	u, _ := url.Parse("https://example.com/api?token=a&token=b&token=c")
	result := sanitizeURL(u)
	assert.NotContains(t, result, "a")
	assert.NotContains(t, result, "b")
	assert.NotContains(t, result, "c")
	// Expect three URL-encoded [REDACTED] markers
	assert.Equal(t, 3, strings.Count(result, "%5BREDACTED%5D"))
}

func TestSanitizeURL_EmptyQueryString(t *testing.T) {
	u, _ := url.Parse("https://example.com/api")
	result := sanitizeURL(u)
	assert.Equal(t, "/api", result)
}

func TestSanitizeURL_NilURL(t *testing.T) {
	result := sanitizeURL(nil)
	assert.Equal(t, "", result)
}

func TestSanitizeURL_PreservesNonSensitiveParameters(t *testing.T) {
	u, _ := url.Parse("https://example.com/api?filter=photos&sort=date&limit=10")
	result := sanitizeURL(u)
	assert.Contains(t, result, "filter=photos")
	assert.Contains(t, result, "sort=date")
	assert.Contains(t, result, "limit=10")
}

// =============================================================================
// LoggingMiddleware Tests - Core HTTP Functionality
// =============================================================================

func TestLoggingMiddleware_CapturesStatusCode(t *testing.T) {
	testCases := []int{200, 201, 400, 404, 500}

	for _, expectedStatus := range testCases {
		t.Run(http.StatusText(expectedStatus), func(t *testing.T) {
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(expectedStatus)
			})

			req := httptest.NewRequest("GET", "/test", nil)
			rr := httptest.NewRecorder()

			middleware := LoggingMiddleware(handler)
			middleware.ServeHTTP(rr, req)

			assert.Equal(t, expectedStatus, rr.Code)
		})
	}
}

func TestLoggingMiddleware_DefaultStatusOK(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	req := httptest.NewRequest("GET", "/test", nil)
	rr := httptest.NewRecorder()

	middleware := LoggingMiddleware(handler)
	middleware.ServeHTTP(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestLoggingMiddleware_CapturesRequestMethod(t *testing.T) {
	methods := []string{"GET", "POST", "PUT", "DELETE", "PATCH"}

	for _, method := range methods {
		t.Run(method, func(t *testing.T) {
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				assert.Equal(t, method, r.Method)
				w.WriteHeader(http.StatusOK)
			})

			req := httptest.NewRequest(method, "/test", nil)
			rr := httptest.NewRecorder()

			middleware := LoggingMiddleware(handler)
			middleware.ServeHTTP(rr, req)
		})
	}
}

func TestLoggingMiddleware_HandlesRequestsWithSensitiveURLs(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest("GET", "/api/auth?token=secret123", nil)
	rr := httptest.NewRecorder()

	middleware := LoggingMiddleware(handler)
	middleware.ServeHTTP(rr, req)

	// The middleware should complete successfully even with sensitive URL parameters
	assert.Equal(t, http.StatusOK, rr.Code)
}

// =============================================================================
// statusResponseWriter Tests - Interface Implementations
// =============================================================================

func TestStatusResponseWriter_WriteHeader(t *testing.T) {
	rr := httptest.NewRecorder()
	writer := newStatusResponseWriter(rr)

	writer.WriteHeader(http.StatusNotFound)

	assert.Equal(t, http.StatusNotFound, writer.status)
	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestStatusResponseWriter_Write(t *testing.T) {
	rr := httptest.NewRecorder()
	writer := newStatusResponseWriter(rr)

	data := []byte("test data")
	n, err := writer.Write(data)

	assert.NoError(t, err)
	assert.Equal(t, len(data), n)
	assert.Equal(t, http.StatusOK, writer.status)
	assert.Equal(t, "test data", rr.Body.String())
}

func TestStatusResponseWriter_WriteWithoutExplicitHeader(t *testing.T) {
	rr := httptest.NewRecorder()
	writer := newStatusResponseWriter(rr)

	writer.Write([]byte("data"))

	assert.Equal(t, http.StatusOK, writer.status)
}

func TestStatusResponseWriter_Hijack_NotSupported(t *testing.T) {
	rr := httptest.NewRecorder()
	writer := newStatusResponseWriter(rr)

	conn, rw, err := writer.Hijack()

	assert.Nil(t, conn)
	assert.Nil(t, rw)
	assert.Equal(t, http.ErrNotSupported, err)
}

func TestStatusResponseWriter_Flush_NotSupported(t *testing.T) {
	rr := httptest.NewRecorder()
	writer := newStatusResponseWriter(rr)

	// Should not panic when flusher is not supported
	assert.NotPanics(t, func() {
		writer.Flush()
	})
}

func TestStatusResponseWriter_Push_NotSupported(t *testing.T) {
	rr := httptest.NewRecorder()
	writer := newStatusResponseWriter(rr)

	err := writer.Push("/resource", nil)

	assert.Equal(t, http.ErrNotSupported, err)
}

// Mock implementations for testing optional interfaces
type mockHijackableResponseWriter struct {
	*httptest.ResponseRecorder
}

func (m *mockHijackableResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	return nil, nil, nil // Simple mock
}

func TestStatusResponseWriter_Hijack_WhenSupported(t *testing.T) {
	mock := &mockHijackableResponseWriter{ResponseRecorder: httptest.NewRecorder()}
	writer := newStatusResponseWriter(mock)
	_, _, err := writer.Hijack()
	// Presence of no error indicates supported path was used (not ErrNotSupported)
	assert.NoError(t, err)
}

type mockFlushableResponseWriter struct {
	*httptest.ResponseRecorder
	flushed bool
}

func (m *mockFlushableResponseWriter) Flush() {
	m.flushed = true
}

func TestStatusResponseWriter_Flush_WhenSupported(t *testing.T) {
	mock := &mockFlushableResponseWriter{ResponseRecorder: httptest.NewRecorder()}
	writer := newStatusResponseWriter(mock)

	writer.Flush()

	assert.True(t, mock.flushed)
}

// =============================================================================
// InitializeLogging and CloseLogging Tests
// =============================================================================

func TestInitializeLogging_NoLogPath(t *testing.T) {
	// Clear any existing log path environment variable
	t.Setenv("PHOTOVIEW_ACCESS_LOG_PATH", "")

	// Should not panic when no log path is configured
	assert.NotPanics(t, func() {
		InitializeLogging()
		CloseLogging()
	})
}

func TestInitializeLogging_WithValidPath(t *testing.T) {
	tempDir := t.TempDir()
	logDir := filepath.Join(tempDir, "logs")
	t.Setenv("PHOTOVIEW_ACCESS_LOG_PATH", logDir)

	InitializeLogging()
	defer CloseLogging()

	// Verify log directory was created
	_, err := os.Stat(logDir)
	assert.NoError(t, err)
}

func TestInitializeLogging_CreatesParentDirectory(t *testing.T) {
	tempDir := t.TempDir()
	logDir := filepath.Join(tempDir, "parent", "logs")
	t.Setenv("PHOTOVIEW_ACCESS_LOG_PATH", logDir)

	InitializeLogging()
	defer CloseLogging()

	// Verify parent directories were created
	_, err := os.Stat(logDir)
	assert.NoError(t, err)
}

func TestCloseLogging_HandlesNilLogFile(t *testing.T) {
	// Should not panic when closing with no active log file
	assert.NotPanics(t, func() {
		CloseLogging()
	})
}

func TestCloseLogging_ClosesActiveLogFile(t *testing.T) {
	tempDir := t.TempDir()
	logDir := filepath.Join(tempDir, "logs")
	t.Setenv("PHOTOVIEW_ACCESS_LOG_PATH", logDir)

	InitializeLogging()

	// Trigger a log write by making a test HTTP request through the middleware
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	req := httptest.NewRequest("GET", "/test", nil)
	rr := httptest.NewRecorder()
	middleware := LoggingMiddleware(handler)
	middleware.ServeHTTP(rr, req)

	// Verify log file exists
	logPath := filepath.Join(logDir, "access.log")
	_, err := os.Stat(logPath)
	assert.NoError(t, err)

	// Close should not panic
	assert.NotPanics(t, func() {
		CloseLogging()
	})
}

// =============================================================================
// Thread-Safety Tests - Basic Concurrent Access
// =============================================================================

func TestLoggingMiddleware_ConcurrentRequests(t *testing.T) {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	middleware := LoggingMiddleware(handler)

	// Run 10 concurrent requests
	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			req := httptest.NewRequest("GET", "/test", nil)
			rr := httptest.NewRecorder()
			middleware.ServeHTTP(rr, req)
		}()
	}

	// Should complete without panics or deadlocks
	wg.Wait()
}

func TestInitializeAndCloseLogging_Concurrent(t *testing.T) {
	tempDir := t.TempDir()
	logDir := filepath.Join(tempDir, "logs")
	t.Setenv("PHOTOVIEW_ACCESS_LOG_PATH", logDir)

	// Initialize once
	InitializeLogging()
	defer CloseLogging()

	// Multiple goroutines performing logging operations concurrently
	var wg sync.WaitGroup
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	middleware := LoggingMiddleware(handler)

	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			req := httptest.NewRequest("GET", "/test", nil)
			rr := httptest.NewRecorder()
			middleware.ServeHTTP(rr, req)
		}()
	}

	// Should complete without panics or race conditions
	wg.Wait()
}
