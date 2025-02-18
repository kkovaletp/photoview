package routes

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"

	"github.com/kkovaletp/photoview/api/graphql/auth"
	"github.com/kkovaletp/photoview/api/graphql/models"
	"github.com/kkovaletp/photoview/api/test_utils"
)

func TestRegisterPhotoRoutes(t *testing.T) {
	db := test_utils.DatabaseTest(t)
	router := mux.NewRouter()

	// Create temporary cache directory
	tmpDir := t.TempDir()
	cachedPath := filepath.Join(tmpDir, "test_photo.jpg")
	if !assert.NoError(t, os.MkdirAll(filepath.Dir(cachedPath), 0755)) {
		return
	}
	if !assert.NoError(t, os.WriteFile(cachedPath, []byte("test image data"), 0644)) {
		return
	}

	tests := []struct {
		name           string
		setupDB        func(*testing.T, *gorm.DB) (*models.User, *models.Media)
		authenticate   bool
		expectedStatus int
		expectedBody   string
	}{
		{
			name: "successful photo retrieval",
			setupDB: func(t *testing.T, tx *gorm.DB) (*models.User, *models.Media) {
				user, media := setupTestData(t, tx)
				mediaURL := models.MediaURL{
					Media:     media,
					MediaID:   media.ID,
					MediaName: "test_photo.jpg",
					Purpose:   models.PhotoThumbnail,
				}
				assert.NoError(t, tx.Save(&mediaURL).Error)
				return user, media
			},
			authenticate:   true,
			expectedStatus: http.StatusOK,
		},
		{
			name: "media URL not found",
			setupDB: func(t *testing.T, tx *gorm.DB) (*models.User, *models.Media) {
				user, media := setupTestData(t, tx)
				return user, media
			},
			authenticate:   true,
			expectedStatus: http.StatusNotFound,
			expectedBody:   "404",
		},
		{
			name: "media is nil",
			setupDB: func(t *testing.T, tx *gorm.DB) (*models.User, *models.Media) {
				user, _ := setupTestData(t, tx)
				mediaURL := models.MediaURL{
					Media:     nil,
					MediaName: "test_photo.jpg",
					Purpose:   models.PhotoThumbnail,
				}
				assert.NoError(t, tx.Save(&mediaURL).Error)
				return user, nil
			},
			authenticate:   true,
			expectedStatus: http.StatusNotFound,
			expectedBody:   "404 - Media not found",
		},
		{
			name: "unauthenticated request",
			setupDB: func(t *testing.T, tx *gorm.DB) (*models.User, *models.Media) {
				user, media := setupTestData(t, tx)
				mediaURL := models.MediaURL{
					Media:     media,
					MediaID:   media.ID,
					MediaName: "test_photo.jpg",
					Purpose:   models.PhotoThumbnail,
				}
				assert.NoError(t, tx.Save(&mediaURL).Error)
				return user, media
			},
			authenticate:   false,
			expectedStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Use transaction to isolate database changes
			tx := db.Begin()
			defer tx.Rollback()

			// Setup test case
			user, _ := tt.setupDB(t, tx)

			// Register routes with transaction
			RegisterPhotoRoutes(tx, router)

			// Create request
			req := httptest.NewRequest("GET", "/test_photo.jpg", nil)
			if tt.authenticate {
				ctx := auth.AddUserToContext(req.Context(), user)
				req = req.WithContext(ctx)
			}
			w := httptest.NewRecorder()

			// Serve request
			router.ServeHTTP(w, req)

			// Assert response
			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.expectedBody != "" {
				assert.Equal(t, tt.expectedBody, w.Body.String())
			}
			if tt.expectedStatus == http.StatusOK {
				assert.Equal(t, "private, max-age=86400, immutable", w.Header().Get("Cache-Control"))
				assert.Equal(t, "test image data", w.Body.String())
			}
		})
	}
}

func setupTestData(t *testing.T, tx *gorm.DB) (*models.User, *models.Media) {
	user, err := models.RegisterUser(tx, "testuser", nil, false)
	if !assert.NoError(t, err) {
		t.FailNow()
	}

	album := models.Album{
		Title: "test_album",
		Path:  "/test/photos",
	}
	if !assert.NoError(t, tx.Save(&album).Error) {
		t.FailNow()
	}
	if !assert.NoError(t, tx.Model(&user).Association("Albums").Append(&album)) {
		t.FailNow()
	}

	media := models.Media{
		Title:   "test_photo.jpg",
		Path:    "/test/photos/test_photo.jpg",
		AlbumID: album.ID,
	}
	if !assert.NoError(t, tx.Save(&media).Error) {
		t.FailNow()
	}

	return user, &media
}
