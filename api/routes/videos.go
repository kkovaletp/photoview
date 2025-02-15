package routes

import (
	"log"
	"net/http"
	"os"
	"path"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/kkovaletp/photoview/api/graphql/models"
	"github.com/kkovaletp/photoview/api/scanner"
	"github.com/kkovaletp/photoview/api/utils"
	"gorm.io/gorm"
)

func RegisterVideoRoutes(db *gorm.DB, router *mux.Router) {

	router.HandleFunc("/{name}", func(w http.ResponseWriter, r *http.Request) {
		mediaName := mux.Vars(r)["name"]

		var mediaURLs []models.MediaURL
		if err := db.Model(&models.MediaURL{}).Select("media_urls.*").Joins("Media").Where("media_urls.media_name = ? AND media_urls.purpose = ?", mediaName, models.VideoWeb).Find(&mediaURLs).Error; err != nil || len(mediaURLs) == 0 || mediaURLs[0].Media == nil {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("404"))
			return
		}

		if len(mediaURLs) > 1 {
			log.Printf("WARN: Multiple video web URLs found for name %s\n", mediaName)
		}

		mediaURL := mediaURLs[0]
		var media = mediaURL.Media

		if success, response, status, err := authenticateMedia(media, db, r); !success {
			if err != nil {
				log.Printf("WARN: error authenticating video: %s\n", err)
			}
			w.WriteHeader(status)
			w.Write([]byte(response))
			return
		}

		var cachedPath string

		if mediaURL.Purpose == models.VideoWeb {
			cachedPath = path.Join(utils.MediaCachePath(), strconv.Itoa(int(media.AlbumID)), strconv.Itoa(int(mediaURL.MediaID)), mediaURL.MediaName)
		} else {
			log.Printf("ERROR: Can not handle media_purpose for video: %s\n", mediaURL.Purpose)
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("internal server error"))
			return
		}

		if _, err := os.Stat(cachedPath); err != nil {
			if os.IsNotExist(err) {
				if err := scanner.ProcessSingleMedia(db, media); err != nil {
					log.Printf("ERROR: processing video not found in cache: %s\n", err)
					w.WriteHeader(http.StatusInternalServerError)
					w.Write([]byte("internal server error"))
					return
				}

				if _, err := os.Stat(cachedPath); err != nil {
					log.Printf("ERROR: after reprocessing video not found in cache: %s\n", err)
					w.WriteHeader(http.StatusInternalServerError)
					w.Write([]byte("internal server error"))
					return
				}
			}
		}

		http.ServeFile(w, r, cachedPath)
	})
}
