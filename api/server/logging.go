package server

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/kkovaletp/photoview/api/graphql/auth"
	"github.com/kkovaletp/photoview/api/log"
	"github.com/kkovaletp/photoview/api/utils"
	"github.com/wsxiaoys/terminal/color"
)

var (
	logFile   *os.File
	logMutex  sync.RWMutex
	logWriter io.Writer
)

// InitializeLogging sets up the logging system with optional file output
func InitializeLogging() error {
	logMutex.Lock()
	defer logMutex.Unlock()

	// Default to console output
	logWriter = os.Stdout

	// If log path is configured, open file and create multi-writer
	if logPath := utils.AccessLogPath(); logPath != "" {
		file, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
		if err != nil {
			return fmt.Errorf("failed to open access log file %s: %w", logPath, err)
		}
		logFile = file
		logWriter = io.MultiWriter(os.Stdout, file)
		log.Info(context.TODO(), "Access logging enabled to file", "logfile", logPath)
	}

	if strings.ToLower(utils.AccessLogLevel()) == "debug" {
		log.Warn(context.TODO(), "Debug access logging enabled")
	}

	return nil
}

// CloseLogging closes logging resources
func CloseLogging() {
	logMutex.Lock()
	defer logMutex.Unlock()

	if logFile != nil {
		logFile.Close()
		logFile = nil
	}
}

// Thread-safe log writing
func writeLog(format string, args ...interface{}) {
	logMutex.RLock()
	defer logMutex.RUnlock()

	if logWriter != nil {
		fmt.Fprintf(logWriter, format, args...)
	}
}

func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		debugEnabled := strings.ToLower(utils.AccessLogLevel()) == "debug"

		// Debug logging: incoming request
		if debugEnabled {
			writeLog("\n=== INCOMING REQUEST [%d ms] ===\n", time.Now().UnixMilli())
			writeLog("Method: %s\n", r.Method)
			writeLog("URL: %s\n", r.URL.String())
			writeLog("Host: %s\n", r.Host)
			writeLog("RemoteAddr: %s\n", r.RemoteAddr)
			writeLog("User-Agent: %s\n", r.UserAgent())
			writeLog("Content-Length: %d\n", r.ContentLength)

			// Log all headers
			writeLog("Headers:\n")
			for name, values := range r.Header {
				for _, value := range values {
					writeLog("  %s: %s\n", name, value)
				}
			}

			// Log request body (with size limit for safety)
			if r.Body != nil && r.ContentLength > 0 && r.ContentLength < 50000 { // 50KB limit
				bodyBytes, err := io.ReadAll(r.Body)
				if err == nil {
					r.Body = io.NopCloser(bytes.NewReader(bodyBytes))
					// Only log text-like content types
					if isBinaryData(bodyBytes) {
						writeLog("Body: [binary content, %d bytes]\n", len(bodyBytes))
					} else {
						writeLog("Body: %s\n", string(bodyBytes))
					}
				}
			} else if r.ContentLength >= 50000 {
				writeLog("Body: [large content, %d bytes - not logged]\n", r.ContentLength)
			}
			writeLog("=== PROCESSING ===\n")
		}

		// Choose appropriate response writer based on debug mode
		if debugEnabled {
			// Use debug writer with capture capabilities
			debugWriter := newDebugStatusResponseWriter(&w)
			next.ServeHTTP(debugWriter, r)

			elapsed := time.Since(start)
			elapsedMs := elapsed.Nanoseconds() / 1e6 // Convert to milliseconds

			// Debug logging: response
			writeLog("=== RESPONSE [%d ms] ===\n", time.Now().UnixMilli())
			writeLog("Status: %d\n", debugWriter.status)
			writeLog("Duration: %d ms\n", elapsedMs)
			writeLog("Response-Size: %d bytes\n", debugWriter.bodySize)

			// Log response headers if available
			if len(debugWriter.capturedHeaders) > 0 {
				writeLog("Response Headers:\n")
				for name, values := range debugWriter.capturedHeaders {
					for _, value := range values {
						writeLog("  %s: %s\n", name, value)
					}
				}
			}

			// Log response body with same binary detection
			if debugWriter.bodyBuffer.Len() > 0 {
				responseBody := debugWriter.bodyBuffer.Bytes()
				if isBinaryData(responseBody) {
					writeLog("Response Body: [binary content, %d bytes]\n", len(responseBody))
				} else {
					writeLog("Response Body: %s\n", string(responseBody))
				}
			} else if debugWriter.bodySize > 50000 {
				writeLog("Response Body: [large content, %d bytes - not logged]\n", debugWriter.bodySize)
			} else if debugWriter.bodySize > 0 {
				writeLog("Response Body: [content was written but not captured]\n")
			}
			writeLog("========================\n\n")

			// Standard logging
			logStandardRequest(r, debugWriter.status, elapsedMs)

		} else {
			// Use simple writer with minimal overhead
			simpleWriter := newSimpleStatusResponseWriter(&w)
			next.ServeHTTP(simpleWriter, r)

			elapsed := time.Since(start)
			elapsedMs := elapsed.Nanoseconds() / 1e6

			// Only standard logging (no debug overhead)
			logStandardRequest(r, simpleWriter.status, elapsedMs)
		}
	})
}

func logStandardRequest(r *http.Request, status int, elapsedMs int64) {
	date := time.Now().Format("2006/01/02 15:04:05")

	// Color coding for status (preserve existing logic)
	var statusColor string
	switch {
	case status < 200:
		statusColor = color.Colorize("b")
	case status < 300:
		statusColor = color.Colorize("g")
	case status < 400:
		statusColor = color.Colorize("c")
	case status < 500:
		statusColor = color.Colorize("y")
	default:
		statusColor = color.Colorize("r")
	}

	// Color coding for method
	method := r.Method
	var methodColor string
	switch {
	case method == http.MethodGet:
		methodColor = color.Colorize("b")
	case method == http.MethodPost:
		methodColor = color.Colorize("g")
	case method == http.MethodOptions:
		methodColor = color.Colorize("y")
	default:
		methodColor = color.Colorize("r")
	}

	user := auth.UserFromContext(r.Context())
	userText := "unauthenticated"
	if user != nil {
		userText = color.Sprintf("@ruser: %s", user.Username)
	}

	statusText := color.Sprintf("%s%s %s%d", methodColor, r.Method, statusColor, status)
	requestText := fmt.Sprintf("%s%s", r.Host, r.URL.Path)
	durationText := color.Sprintf("@c%s", elapsedMs)

	fmt.Printf("%s %s %s %s %s\n", date, statusText, requestText, durationText, userText)

}

func isBinaryData(data []byte) bool {
	if len(data) == 0 {
		return false
	}

	// Check first 512 bytes (or less) for null bytes and UTF-8 validity
	checkSize := len(data)
	if checkSize > 512 {
		checkSize = 512
	}

	// Method 1: Check for null bytes (most binary files contain null bytes)
	for i := 0; i < checkSize; i++ {
		if data[i] == 0 {
			return true
		}
	}

	// Method 2: Check if it's valid UTF-8 text
	// If it's not valid UTF-8, it's likely binary
	if !utf8.Valid(data[:checkSize]) {
		return true
	}

	// Method 3: Check for high ratio of non-printable characters
	nonPrintable := 0
	for i := 0; i < checkSize; i++ {
		b := data[i]
		// Consider bytes outside printable ASCII range (excluding common whitespace)
		if b < 32 && b != 9 && b != 10 && b != 13 {
			nonPrintable++
		} else if b > 126 {
			// Allow extended UTF-8, but count high values
			if b > 240 { // Very high values suggest binary
				nonPrintable++
			}
		}
	}

	// If more than 10% non-printable, consider it binary
	return float64(nonPrintable)/float64(checkSize) > 0.1
}

type simpleStatusResponseWriter struct {
	http.ResponseWriter
	status   int
	hijacker http.Hijacker
}

// Enhanced status response writer that captures headers
type debugStatusResponseWriter struct {
	http.ResponseWriter
	status          int
	hijacker        http.Hijacker
	capturedHeaders http.Header
	bodyBuffer      *bytes.Buffer
	bodySize        int64
}

func newSimpleStatusResponseWriter(w *http.ResponseWriter) *simpleStatusResponseWriter {
	writer := &simpleStatusResponseWriter{
		ResponseWriter: *w,
	}

	if hj, ok := (*w).(http.Hijacker); ok {
		writer.hijacker = hj
	}

	return writer
}

func newDebugStatusResponseWriter(w *http.ResponseWriter) *debugStatusResponseWriter {
	writer := &debugStatusResponseWriter{
		ResponseWriter:  *w,
		capturedHeaders: make(http.Header),
		bodyBuffer:      &bytes.Buffer{},
	}

	if hj, ok := (*w).(http.Hijacker); ok {
		writer.hijacker = hj
	}

	return writer
}

func (w *simpleStatusResponseWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (w *debugStatusResponseWriter) WriteHeader(status int) {
	w.status = status
	for k, v := range w.ResponseWriter.Header() {
		w.capturedHeaders[k] = v
	}
	w.ResponseWriter.WriteHeader(status)
}

func (w *simpleStatusResponseWriter) Write(b []byte) (int, error) {
	if w.status == 0 {
		w.status = 200
	}
	return w.ResponseWriter.Write(b)
}

func (w *debugStatusResponseWriter) Write(b []byte) (int, error) {
	if w.status == 0 {
		w.status = 200
	}

	// Capture response body (with size limit for memory safety)
	if w.bodySize < 50000 { // Same 50KB limit as request
		remainingCapacity := 50000 - w.bodySize
		if int64(len(b)) <= remainingCapacity {
			w.bodyBuffer.Write(b)
		} else {
			// Write only what fits
			w.bodyBuffer.Write(b[:remainingCapacity])
		}
	}
	w.bodySize += int64(len(b))

	return w.ResponseWriter.Write(b)
}

func (w *simpleStatusResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if w.hijacker == nil {
		return nil, nil, errors.New("http.Hijacker not implemented by underlying http.ResponseWriter")
	}
	return w.hijacker.Hijack()
}

func (w *debugStatusResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if w.hijacker == nil {
		return nil, nil, errors.New("http.Hijacker not implemented by underlying http.ResponseWriter")
	}
	return w.hijacker.Hijack()
}
