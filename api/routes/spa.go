package routes

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// SpaHandler implements the http.Handler interface, so we can use it
// to respond to HTTP requests. The path to the static directory and
// path to the index file within that static directory are used to
// serve the SPA in the given static directory.
type SpaHandler struct {
	staticPath string
	indexPath  string
}

func NewSpaHandler(staticPath string, indexPath string) SpaHandler {
	return SpaHandler{
		indexPath:  indexPath,
		staticPath: staticPath,
	}
}

// ServeHTTP inspects the URL path to locate a file within the static dir
// on the SPA handler. If a file is found, it will be served. If not, the
// file located at the index path on the SPA handler will be served. This
// is suitable behavior for serving an SPA (single page application).
func (h SpaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Try to serve pre-compressed file
	if h.tryServePrecompressed(w, r) {
		return
	}

	// Fallback to original SPA handler logic
	h.serveOriginal(w, r)
}

func (h SpaHandler) tryServePrecompressed(w http.ResponseWriter, r *http.Request) bool {
	// Clean the path and resolve to filesystem path
	path := filepath.Join(h.staticPath, filepath.Clean(r.URL.Path))

	// Check if the original file exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		// File doesn't exist - let serveOriginal handle SPA routing
		// TODO: serve pre-compressed index.html if it exists?
		return false
	}

	// Don't compress already-compressed files
	if isCompressedFormat(path) {
		return false
	}

	// Parse Accept-Encoding header
	acceptEncoding := r.Header.Get("Accept-Encoding")

	// Check for pre-compressed variants in order of preference (br > zst > gzip)
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
			precompressedPath := path + enc.extension
			if stat, err := os.Stat(precompressedPath); err == nil && !stat.IsDir() {
				// Serve pre-compressed file
				w.Header().Set("Content-Encoding", enc.name)
				w.Header().Set("Vary", "Accept-Encoding")

				// Set cache headers for static assets
				if strings.HasPrefix(r.URL.Path, "/assets/") {
					w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
				} else {
					w.Header().Set("Cache-Control", "public, max-age=3600, must-revalidate")
				}

				http.ServeFile(w, r, precompressedPath)
				return true
			}
		}
	}

	return false
}

func (h SpaHandler) serveOriginal(w http.ResponseWriter, r *http.Request) {
	// Get the absolute path to prevent directory traversal
	path := filepath.Join(h.staticPath, filepath.Clean(r.URL.Path))

	// Check whether a file exists at the given path
	_, err := os.Stat(path)
	if os.IsNotExist(err) {
		// File does not exist, serve index.html (SPA routing)
		http.ServeFile(w, r, filepath.Join(h.staticPath, h.indexPath))
		return
	} else if err != nil {
		// If we got an error (that wasn't that the file doesn't exist) stating the
		// file, return a 500 internal server error and stop
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Set cache headers
	if strings.HasPrefix(r.URL.Path, "/assets/") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		w.Header().Set("Cache-Control", "public, max-age=3600, must-revalidate")
	}

	// For already-compressed formats, set Content-Encoding to "identity" to prevent real-time compression
	if isCompressedFormat(path) {
		w.Header().Set("Content-Encoding", "identity")
	}

	// Otherwise, use http.FileServer to serve the static file
	// Note: CompressHandler will handle real-time compression if needed
	http.FileServer(http.Dir(h.staticPath)).ServeHTTP(w, r)
}

func isCompressedFormat(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	compressedExts := []string{
		".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif",
		".mp4", ".webm", ".mkv", ".avi",
		".mp3", ".ogg", ".m4a",
		".zip", ".gz", ".bz2", ".xz", ".7z", ".br", ".zst",
		".woff", ".woff2", ".ttf", ".otf",
	}

	for _, compExt := range compressedExts {
		if ext == compExt {
			return true
		}
	}
	return false
}
