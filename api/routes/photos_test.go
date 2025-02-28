package routes

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
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
	cacheDir := t.TempDir()
	if _, err := os.ReadDir(cacheDir); err != nil {
		if err := os.MkdirAll(cacheDir, 0755); err != nil {
			t.Fatalf("Failed to create cache directory: %v", err)
		}
	}
	t.Setenv("PHOTOVIEW_MEDIA_CACHE", cacheDir)

	// Copy test photo to cache
	testPhotoPath := "../scanner/exif/test_data/bird.jpg"
	testPhotoData, err := os.ReadFile(testPhotoPath)
	if err != nil {
		t.Fatalf("Failed to read test photo at %s: %v", testPhotoPath, err)
	}

	router := mux.NewRouter()

	tests := []struct {
		name           string
		setupDB        func(*testing.T, *gorm.DB, string) (*models.User, *models.Media, string)
		authenticate   bool
		expectedStatus int
		expectedBody   []byte
	}{
		{
			name: "successful photo retrieval",
			setupDB: func(t *testing.T, tx *gorm.DB, cacheDir string) (*models.User, *models.Media, string) {
				user, media := setupTestData(t, tx)

				// Create the actual file in cache
				mediaFileName := "photo_retrieval_test.jpg"
				cachedPath := filepath.Join(cacheDir, mediaFileName)
				if err := os.WriteFile(cachedPath, testPhotoData, 0644); err != nil {
					t.Fatalf("Failed to create test image: %v", err)
				}

				mediaURL := models.MediaURL{
					Media:     media,
					MediaID:   media.ID,
					MediaName: mediaFileName,
					Purpose:   models.PhotoThumbnail,
				}
				assert.NoError(t, tx.Create(&mediaURL).Error)
				return user, media, mediaFileName
			},
			authenticate:   true,
			expectedStatus: http.StatusOK,
			expectedBody:   testPhotoData,
		},
		{
			name: "media URL not found",
			setupDB: func(t *testing.T, tx *gorm.DB, cacheDir string) (*models.User, *models.Media, string) {
				user, media := setupTestData(t, tx)
				return user, media, "nonexistent_file.jpg"
			},
			authenticate:   true,
			expectedStatus: http.StatusNotFound,
			expectedBody:   []byte("404"),
		},
		{
			name: "media is nil",
			setupDB: func(t *testing.T, tx *gorm.DB, cacheDir string) (*models.User, *models.Media, string) {
				user, media := setupTestData(t, tx)

				// Create a separate media to delete
				deletableMedia := models.Media{
					Title:   "deletable_photo.jpg",
					Path:    "/test/photos/deletable_photo.jpg",
					AlbumID: media.AlbumID, // Use same album as the other media
				}
				assert.NoError(t, tx.Create(&deletableMedia).Error)

				mediaFileName := "nil_media_test.jpg"
				mediaURL := models.MediaURL{
					Media:     &deletableMedia,
					MediaID:   deletableMedia.ID, // Non-existent media ID
					MediaName: mediaFileName,
					Purpose:   models.PhotoThumbnail,
				}
				assert.NoError(t, tx.Create(&mediaURL).Error)

				// Delete the media after creating the URL reference
				assert.NoError(t, tx.Delete(&deletableMedia).Error)

				return user, media, mediaFileName
			},
			authenticate:   true,
			expectedStatus: http.StatusNotFound,
			expectedBody:   []byte("404"),
		},
		{
			name: "unauthenticated request",
			setupDB: func(t *testing.T, tx *gorm.DB, cacheDir string) (*models.User, *models.Media, string) {
				user, media := setupTestData(t, tx)

				// Create the actual file in cache
				mediaFileName := "unauthenticated_test.jpg"
				cachedPath := filepath.Join(cacheDir, mediaFileName)
				if err := os.WriteFile(cachedPath, testPhotoData, 0644); err != nil {
					t.Fatalf("Failed to create test image: %v", err)
				}

				mediaURL := models.MediaURL{
					Media:     media,
					MediaID:   media.ID,
					MediaName: mediaFileName,
					Purpose:   models.PhotoThumbnail,
				}
				assert.NoError(t, tx.Create(&mediaURL).Error)
				return user, media, mediaFileName
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
			user, _, mediaFileName := tt.setupDB(t, tx, cacheDir)

			// Register routes with transaction
			RegisterPhotoRoutes(tx, router)

			// Create request
			req := httptest.NewRequest("GET", "/"+mediaFileName, nil)
			if tt.authenticate {
				ctx := auth.AddUserToContext(req.Context(), user)
				req = req.WithContext(ctx)
			}
			w := httptest.NewRecorder()

			// Serve request
			router.ServeHTTP(w, req)

			// Assert response
			assert.Equal(t, tt.expectedStatus, w.Code, "Response status code didn't match expected")
			if tt.expectedBody != nil {
				// For binary data, compare directly without string conversion
				if w.Code == http.StatusOK && bytes.Equal(tt.expectedBody, testPhotoData) {
					assert.Equal(t, testPhotoData, w.Body.Bytes(), "Response body didn't match expected")
				} else {
					// For error messages, compare as strings for better readability
					assert.Equal(t, string(tt.expectedBody), strings.TrimSpace(w.Body.String()), "Response body didn't match expected")
				}
			}
			// Check Cache-Control header for successful responses
			if tt.expectedStatus == http.StatusOK {
				assert.Equal(t, "private, max-age=86400, immutable", w.Header().Get("Cache-Control"), "Cache-Control header missing or incorrect")
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
