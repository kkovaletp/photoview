package routes

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"gorm.io/gorm"

	"github.com/kkovaletp/photoview/api/graphql/models"
	"github.com/kkovaletp/photoview/api/scanner"
)

func RegisterPhotoRoutes(db *gorm.DB, router *mux.Router) {

	router.HandleFunc("/{name}", func(w http.ResponseWriter, r *http.Request) {
		mediaName := mux.Vars(r)["name"]

		var mediaURL models.MediaURL
		result := db.Model(&models.MediaURL{}).Joins("Media").Select("media_urls.*").Where("media_urls.media_name = ?", mediaName).Scan(&mediaURL)
		if err := result.Error; err != nil {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("404"))
			return
		}

		media := mediaURL.Media
		if media == nil {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("404 - Media not found"))
			return
		}

		if success, response, status, err := authenticateMedia(media, db, r); !success {
			if err != nil {
				log.Printf("WARN: error authenticating photo: %s\n", err)
			}
			w.WriteHeader(status)
			w.Write([]byte(response))
			return
		}

		cachedPath, err := mediaURL.CachedPath()
		if err != nil {
			log.Printf("ERROR: %s\n", err)
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(internalServerError))
			return
		}

		if _, err := os.Stat(cachedPath); os.IsNotExist((err)) {
			// err := db.Transaction(func(tx *gorm.DB) error {
			if err = scanner.ProcessSingleMediaFunc(db, media); err != nil {
				log.Printf("ERROR: processing image not found in cache (%s): %s\n", cachedPath, err)
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte(internalServerError))
				return
			}

			if _, err = os.Stat(cachedPath); err != nil {
				log.Printf("ERROR: after reprocessing image not found in cache (%s): %s\n", cachedPath, err)
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte(internalServerError))
				return
			}
		}

		// Allow caching the resource for 1 day
		w.Header().Set("Cache-Control", "private, max-age=86400, immutable")

		http.ServeFile(w, r, cachedPath)
	})
}
