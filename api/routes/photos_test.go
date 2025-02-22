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

	// Create media cache directory structure
	cacheDir := filepath.Join(t.TempDir(), "media_cache/1/1")
	if err := os.MkdirAll(cacheDir, 0755); err != nil {
		t.Fatalf("Failed to create cache directory: %v", err)
	}

	// Set environment variable for media cache
	t.Setenv("PHOTOVIEW_MEDIA_CACHE", cacheDir)

	// Copy test photo to cache
	testPhotoPath := "api/scanner/exif/test_data/bird.jpg"
	cachedPath := filepath.Join(cacheDir, "test_photo.jpg")
	testPhotoData, err := os.ReadFile(testPhotoPath)
	if err != nil {
		t.Fatalf("Failed to read test photo: %v", err)
	}
	if err := os.WriteFile(cachedPath, testPhotoData, 0644); err != nil {
		t.Fatalf("Failed to create test image: %v", err)
	}

	router := mux.NewRouter()

	tests := []struct {
		name           string
		setupDB        func(*testing.T, *gorm.DB) (*models.User, *models.Media)
		authenticate   bool
		expectedStatus int
		expectedBody   []byte
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
				assert.NoError(t, tx.Create(&mediaURL).Error)
				return user, media
			},
			authenticate:   true,
			expectedStatus: http.StatusOK,
			expectedBody:   testPhotoData,
		},
		{
			name: "media URL not found",
			setupDB: func(t *testing.T, tx *gorm.DB) (*models.User, *models.Media) {
				user, media := setupTestData(t, tx)
				return user, media
			},
			authenticate:   true,
			expectedStatus: http.StatusNotFound,
			expectedBody:   []byte("404"),
		},
		{
			name: "media is nil",
			setupDB: func(t *testing.T, tx *gorm.DB) (*models.User, *models.Media) {
				user, _ := setupTestData(t, tx)
				mediaURL := models.MediaURL{
					MediaID:   999, // Non-existent media ID
					MediaName: "test_photo.jpg",
					Purpose:   models.PhotoThumbnail,
				}
				assert.NoError(t, tx.Create(&mediaURL).Error)
				return user, nil
			},
			authenticate:   true,
			expectedStatus: http.StatusNotFound,
			expectedBody:   []byte("404 - Media not found"),
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
				assert.NoError(t, tx.Create(&mediaURL).Error)
				return user, media
			},
			authenticate:   false,
			expectedStatus: http.StatusUnauthorized,
			expectedBody:   []byte("unauthorized"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Use transaction to isolate database changes
			tx := db.Begin()
			if tx.Error != nil {
				t.Fatalf("Failed to begin transaction: %v", tx.Error)
			}

			// Ensure transaction is rolled back after test
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
			if tt.expectedBody != nil {
				assert.Equal(t, string(tt.expectedBody), w.Body.String())
			}
			if tt.expectedStatus == http.StatusOK {
				assert.Equal(t, "private, max-age=86400, immutable", w.Header().Get("Cache-Control"))
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
	if !assert.NoError(t, tx.Create(&album).Error) {
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
	if !assert.NoError(t, tx.Create(&media).Error) {
		t.FailNow()
	}

	return user, &media
}
