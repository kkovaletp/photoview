package routes

import (
	"context"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/kkovaletp/photoview/api/log"
)

// SpaHandler implements the http.Handler interface, so we can use it
// to respond to HTTP requests. The path to the static directory and
// path to the index file within that static directory are used to
// serve the SPA in the given static directory.
type SpaHandler struct {
	staticPath string
	indexPath  string
}

var fullPath string
var relPath string

func NewSpaHandler(staticPath string, indexPath string) SpaHandler {
	staticPathAbs, err := filepath.Abs(staticPath)
	if err != nil {
		log.Error(context.Background(), "static path is not valid", "static path", staticPath, "error", err)
		return SpaHandler{}
	}

	indexPathAbs, err := filepath.Abs(filepath.Join(staticPath, indexPath))
	if err != nil {
		log.Error(context.Background(), "index path is not valid", "index path", indexPath, "error", err)
		return SpaHandler{}
	}

	if stat, err := os.Stat(staticPathAbs); err != nil || !stat.IsDir() {
		if os.IsNotExist(err) {
			log.Error(context.Background(), "static path does not exist", "static path", staticPathAbs)
		} else if os.IsPermission(err) {
			log.Error(context.Background(), "no permission to access static path", "static path", staticPathAbs)
		} else if err != nil {
			log.Error(context.Background(), "error accessing static path", "static path", staticPathAbs, "error", err)
		} else if !stat.IsDir() {
			log.Error(context.Background(), "static path is not a directory", "static path", staticPathAbs)
		}
		return SpaHandler{}
	}

	if stat, err := os.Stat(indexPathAbs); err != nil || stat.IsDir() {
		if os.IsNotExist(err) {
			log.Error(context.Background(), "index path does not exist", "index path", indexPathAbs)
		} else if os.IsPermission(err) {
			log.Error(context.Background(), "no permission to access index path", "index path", indexPathAbs)
		} else if err != nil {
			log.Error(context.Background(), "error accessing index path", "index path", indexPathAbs, "error", err)
		} else if stat.IsDir() {
			log.Error(context.Background(), "index path is a directory, must be a file", "index path", indexPathAbs)
		}
		return SpaHandler{}
	}

	return SpaHandler{
		indexPath:  indexPath,
		staticPath: staticPath,
	}
}

// ServeHTTP inspects the URL path to locate a file within the static dir
// on the SPA handler. If a file is found, it will be served. If not, the
// file located at the index path on the SPA handler will be served. This
// is suitable behavior for serving an SPA (single page application).
// Pre-compressed files (.br, .zst, .gz) are served if the client supports
// them, otherwise the original file is served (with real-time compression
// if suitable).
func (h SpaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if h.staticPath == "" || h.indexPath == "" {
		log.Error(r.Context(), "staticPath or indexPath not configured on SpaHandler")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	absStaticPath, _ := filepath.Abs(h.staticPath)
	relPath = filepath.Clean(r.URL.Path)
	relPath = strings.TrimPrefix(relPath, "/")
	fullPath = filepath.Join(h.staticPath, relPath)
	absPath, err := filepath.Abs(fullPath)
	if err != nil {
		log.Error(
			r.Context(),
			"error building absolute path",
			"static path", absStaticPath,
			"requested path", r.URL.Path,
			"error", err,
		)
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	rel, err := filepath.Rel(absStaticPath, absPath)
	if err != nil || strings.Contains(rel, "..") {
		log.Error(
			r.Context(),
			"requested path is outside of static path",
			"static path", absStaticPath,
			"requested path", r.URL.Path,
			"error", err,
		)
		http.Error(w, "Invalid request URI", http.StatusBadRequest)
		return
	}

	// Try to serve pre-compressed file
	if h.canServePrecompressed(w, r) {
		return
	}

	// Fallback to original SPA handler logic
	h.serveOriginal(w, r)
}

func (h SpaHandler) canServePrecompressed(w http.ResponseWriter, r *http.Request) bool {
	// Check if the original file exists
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		// File doesn't exist - let serveOriginal handle SPA routing
		return false
	}

	// Don't compress already-compressed files
	if isCompressedFormat(strings.ToLower(filepath.Ext(fullPath))) {
		return false
	}

	// Try to serve pre-compressed variant
	return h.servePrecompressedFile(w, r)
}

func (h SpaHandler) serveOriginal(w http.ResponseWriter, r *http.Request) {
	// Check whether a file exists at the given path
	_, err := os.Stat(fullPath)
	if os.IsNotExist(err) {
		// File does not exist, serve index.html (SPA routing)
		indexPath := filepath.Join(h.staticPath, h.indexPath)

		// Try to serve pre-compressed index.html first
		if h.servePrecompressedFile(w, r) {
			return
		}

		// Fallback to uncompressed index.html
		if _, err := os.Stat(indexPath); os.IsNotExist(err) {
			// Index file doesn't exist - this is a serious configuration error
			log.Error(r.Context(), "Error: index.html not found", "index.html path:", indexPath)
			http.Error(w, "Application index file not found", http.StatusInternalServerError)
			return
		}

		// Set cache headers for index.html (short cache, must revalidate)
		w.Header().Set("Cache-Control", "public, max-age=3600, must-revalidate")
		http.ServeFile(w, r, indexPath)
		return
	} else if err != nil {
		// If we got an error (that wasn't that the file doesn't exist) stating the
		// file, return a 500 internal server error and stop
		log.Error(r.Context(), "Error stating file, requested by client", "file path", fullPath, "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Set cache headers
	h.setCacheHeaders(w)

	// Use http.FileServer to serve the static file
	// Note: CompressHandler will handle real-time compression if needed
	http.FileServer(http.Dir(h.staticPath)).ServeHTTP(w, r)
}

// servePrecompressedFile attempts to serve a pre-compressed variant of the file
// Returns true if a pre-compressed file was served, false otherwise
func (h SpaHandler) servePrecompressedFile(w http.ResponseWriter, r *http.Request) bool {
	// Verify the file exists
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		return false
	}

	// Parse Accept-Encoding header
	acceptEncoding := r.Header.Get("Accept-Encoding")
	if acceptEncoding == "" {
		return false
	}

	// Check for pre-compressed variants in order of preference (br > zstd > gzip)
	encodings := []struct {
		name      string
		extension string
	}{
		{"br", ".br"},
		{"zstd", ".zst"},
		{"gzip", ".gz"},
	}

	for _, enc := range encodings {
		if strings.Contains(acceptEncoding, enc.name) {
			precompressedPath := fullPath + enc.extension
			if stat, err := os.Stat(precompressedPath); err == nil && !stat.IsDir() {
				// Detect Content-Type from the ORIGINAL file extension, not the compressed one
				contentType := mime.TypeByExtension(filepath.Ext(fullPath))
				if contentType == "" {
					// Fallback to octet-stream if we can't detect
					contentType = "application/octet-stream"
				}

				w.Header().Set("Content-Type", contentType)
				w.Header().Set("Content-Encoding", enc.name)
				w.Header().Set("Vary", "Accept-Encoding")
				// Set cache headers based on request path
				h.setCacheHeaders(w)

				// Serve pre-compressed file
				http.ServeFile(w, r, precompressedPath)
				return true
			}
		}
	}

	return false
}

// setCacheHeaders sets appropriate cache headers based on the request path
func (h SpaHandler) setCacheHeaders(w http.ResponseWriter) {
	if strings.HasPrefix(relPath, "/assets/") {
		// Long-term cache for fingerprinted assets
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		// Short cache with revalidation for other files
		w.Header().Set("Cache-Control", "public, max-age=3600, must-revalidate")
	}
}

func isCompressedFormat(ext string) bool {
	compressedExts := []string{
		".png", ".ico", ".jpg", ".jpeg", ".gif", ".webp",
		".zip", ".gz", ".br", ".zst",
		".woff", ".woff2",
	}

	for _, compExt := range compressedExts {
		if ext == compExt {
			return true
		}
	}
	return false
}
