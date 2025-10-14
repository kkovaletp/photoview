package server

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/kkovaletp/photoview/api/graphql/auth"
	"github.com/kkovaletp/photoview/api/log"
	"github.com/kkovaletp/photoview/api/utils"
	"gopkg.in/natefinch/lumberjack.v2"
)

var (
	logMutex         sync.RWMutex
	logFile          io.WriteCloser
	logWriter        io.Writer = os.Stdout
	logGlobalContext context.Context
	sensitiveKeys    = []string{
		"access_token", "token", "auth", "authorization", "apikey", "api_key",
		"password", "passwd", "secret", "signature", "session", "jwt", "code",
		"refresh_token", "client_secret", "api_secret", "bearer", "private_key",
	}
)

// InitializeLogging sets up the logging system with optional file output
func InitializeLogging() {
	logMutex.Lock()
	defer logMutex.Unlock()

	// Close existing log file if already initialized (e.g. if called multiple times)
	if logFile != nil {
		logFile.Close()
		logFile = nil
	}

	logGlobalContext = context.Background()

	// If log path is configured, set up rotating file logger as part of multi-writer
	if logPath, err := utils.AccessLogPath(); logPath != "" && err == nil {
		logParentDir := filepath.Dir(logPath)
		stat, err := os.Stat(logParentDir)
		const LOG_PATH_STR = "log path"
		if os.IsNotExist(err) {
			if err := os.MkdirAll(logParentDir, 0755); err != nil {
				log.Error(
					logGlobalContext,
					"failed to create log directory, defaulting to console logging",
					"log directory", logParentDir,
					LOG_PATH_STR, logPath,
					"error", err,
				)
				return
			}
			// Re-stat after successful directory creation
			stat, err = os.Stat(logParentDir)
		}
		if err != nil {
			log.Error(
				logGlobalContext,
				"failed to stat log directory, defaulting to console logging",
				"log directory", logParentDir,
				LOG_PATH_STR, logPath,
				"error", err,
			)
			return
		}
		if !stat.IsDir() {
			log.Error(
				logGlobalContext,
				"log files location is not a directory, defaulting to console logging",
				"log files location", logParentDir,
				LOG_PATH_STR, logPath,
			)
			return
		}

		rotatingLogger := &lumberjack.Logger{
			Filename:   logPath,
			MaxSize:    utils.AccessLogMaxSize(),
			MaxBackups: utils.AccessLogMaxFiles(),
			MaxAge:     utils.AccessLogMaxDays(),
			Compress:   utils.EnvAccessLogIsCompressed.GetBool(),
			LocalTime:  true,
		}

		logFile = rotatingLogger
		logWriter = io.MultiWriter(os.Stdout, logFile)

		log.Info(
			logGlobalContext,
			"Access logging enabled to file",
			"logfile", rotatingLogger.Filename,
			"max size in MB", rotatingLogger.MaxSize,
			"max files", rotatingLogger.MaxBackups,
			"max age in days", rotatingLogger.MaxAge,
			"compressed", rotatingLogger.Compress,
		)
	} else if err != nil {
		log.Error(
			logGlobalContext,
			"failed to build absolute path for the access log path, defaulting to console logging",
			"error", err,
		)
	}
}

// CloseLogging closes logging resources
func CloseLogging() {
	logMutex.Lock()
	defer logMutex.Unlock()

	if logFile != nil {
		if err := logFile.Close(); err != nil {
			log.Error(logGlobalContext, "Failed to close log file", "error", err)
		}
		logWriter = os.Stdout
		logFile = nil
		logGlobalContext = context.Background()
	}
}

// Thread-safe log writing
func writeLog(format string, args ...interface{}) {
	logMutex.RLock()
	writer := logWriter
	logMutex.RUnlock()

	if writer != nil {
		fmt.Fprintf(writer, format, args...)
	}
}

func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		writer := newStatusResponseWriter(w)
		next.ServeHTTP(writer, r)

		elapsedMs := time.Since(start).Nanoseconds() / 1e6
		status := writer.status
		if status == 0 {
			status = http.StatusOK
		}

		logStandardRequest(r, status, elapsedMs)
	})
}

func logStandardRequest(r *http.Request, status int, elapsedMs int64) {
	date := time.Now().Format("2006 Jan 02, 15:04:05 (MST) -07:00")
	user := auth.UserFromContext(r.Context())
	requestText := fmt.Sprintf("%s%s", r.Host, sanitizeURL(r.URL))

	userText := "unauthenticated"
	if user != nil {
		userText = fmt.Sprintf("user: %s", user.Username)
	}

	statusText := fmt.Sprintf("%s %d", r.Method, status)
	durationText := fmt.Sprintf("%dms", elapsedMs)

	writeLog("%s %s %s %s %s\n", date, statusText, requestText, durationText, userText)
}

// sanitizeURL redacts sensitive query parameters in a URL
func sanitizeURL(u *url.URL) string {
	if u == nil {
		return ""
	}
	cloneURL := *u
	queryString := cloneURL.Query()
	if len(queryString) == 0 {
		return cloneURL.RequestURI()
	}

	for name := range queryString {
		lowerName := strings.ToLower(name)
		for _, sensitive := range sensitiveKeys {
			if lowerName == sensitive {
				for i := range queryString[name] {
					queryString[name][i] = "[REDACTED]"
				}
				break
			}
		}
	}
	cloneURL.RawQuery = queryString.Encode()
	return cloneURL.RequestURI()
}

type statusResponseWriter struct {
	http.ResponseWriter
	status   int
	hijacker http.Hijacker
	flusher  http.Flusher
	pusher   http.Pusher
}

func newStatusResponseWriter(w http.ResponseWriter) *statusResponseWriter {
	writer := &statusResponseWriter{
		ResponseWriter: w,
	}

	if hj, ok := (w).(http.Hijacker); ok {
		writer.hijacker = hj
	}
	if fl, ok := (w).(http.Flusher); ok {
		writer.flusher = fl
	}
	if pu, ok := (w).(http.Pusher); ok {
		writer.pusher = pu
	}

	return writer
}

func (w *statusResponseWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (w *statusResponseWriter) Write(b []byte) (int, error) {
	if w.status == 0 {
		w.status = 200
	}
	return w.ResponseWriter.Write(b)
}

func (w *statusResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if w.hijacker == nil {
		return nil, nil, http.ErrNotSupported
	}
	return w.hijacker.Hijack()
}

func (w *statusResponseWriter) Flush() {
	if w.flusher != nil {
		w.flusher.Flush()
	}
}

func (w *statusResponseWriter) Push(target string, opts *http.PushOptions) error {
	if w.pusher != nil {
		return w.pusher.Push(target, opts)
	}
	return http.ErrNotSupported
}
