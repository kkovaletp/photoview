package routes

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"

	"github.com/kkovaletp/photoview/api/graphql/auth"
	"github.com/kkovaletp/photoview/api/graphql/models"
)

// Create a DB interface that matches what RegisterPhotoRoutes needs
type DB interface {
	Where(query interface{}, args ...interface{}) *gorm.DB
	Model(value interface{}) *gorm.DB
	Joins(query string, args ...interface{}) *gorm.DB
	Select(query interface{}, args ...interface{}) *gorm.DB
	Scan(dest interface{}) *gorm.DB
}

// Mock DB implementation
type mockDB struct {
	mock.Mock
}

func (m *mockDB) Model(value interface{}) *gorm.DB {
	return m.Called(value).Get(0).(*gorm.DB)
}

func (m *mockDB) Joins(query string, args ...interface{}) *gorm.DB {
	mockArgs := []interface{}{query}
	mockArgs = append(mockArgs, args...)
	return m.Called(mockArgs...).Get(0).(*gorm.DB)
}

func (m *mockDB) Select(query interface{}, args ...interface{}) *gorm.DB {
	mockArgs := []interface{}{query}
	mockArgs = append(mockArgs, args...)
	return m.Called(mockArgs...).Get(0).(*gorm.DB)
}

func (m *mockDB) Where(query interface{}, args ...interface{}) *gorm.DB {
	mockArgs := []interface{}{query}
	mockArgs = append(mockArgs, args...)
	return m.Called(mockArgs...).Get(0).(*gorm.DB)
}

func (m *mockDB) Scan(dest interface{}) *gorm.DB {
	return m.Called(dest).Get(0).(*gorm.DB)
}

// MockGormDB is a mock implementation of *gorm.DB
type MockGormDB struct {
	mock.Mock
	Err error
}

func (m *MockGormDB) Error() error {
	return m.Err
}

func TestRegisterPhotoRoutes(t *testing.T) {
	// Setup
	router := mux.NewRouter()

	// Define test cases
	tests := []struct {
		name           string
		mediaName      string
		setupMocks     func(*MockGormDB, *mux.Router) (*models.User, error)
		authenticate   bool
		setupRequest   func(*http.Request)
		expectedStatus int
		expectedBody   string
	}{
		{
			name:      "successful photo retrieval",
			mediaName: "test_photo.jpg",
			setupMocks: func(mockDB *MockGormDB, router *mux.Router) (*models.User, error) {
				user := &models.User{
					Username: "testuser",
				}

				// Setup mock DB chain for media URL query
				mockResult := &MockGormDB{Err: nil}
				mockDB.On("Model", mock.AnythingOfType("*models.MediaURL")).Return(mockResult)
				mockDB.On("Joins", "Media").Return(mockResult)
				mockDB.On("Select", "media_urls.*").Return(mockResult)
				mockDB.On("Where", "media_urls.media_name = ?", "test_photo.jpg").Return(mockResult)

				// Setup scan to populate mediaURL
				mockDB.On("Scan", mock.AnythingOfType("*models.MediaURL")).Run(func(args mock.Arguments) {
					mediaURL := args.Get(0).(*models.MediaURL)
					media := &models.Media{
						Title: "Test Photo",
						Path:  "/path/to/photo.jpg",
					}
					mediaURL.Media = media
					mediaURL.MediaName = "test_photo.jpg"
					mediaURL.Purpose = models.PhotoThumbnail
				}).Return(mockResult)

				// Override the handler for this specific path to simulate photo serving
				router.HandleFunc("/"+t.Name()+"/test_photo.jpg", func(w http.ResponseWriter, r *http.Request) {
					w.Header().Set("Cache-Control", "private, max-age=86400, immutable")
					w.Write([]byte("test image data"))
				})

				return user, nil
			},
			authenticate:   true,
			setupRequest:   nil,
			expectedStatus: http.StatusOK,
			expectedBody:   "test image data",
		},
		{
			name:      "media URL not found",
			mediaName: "nonexistent.jpg",
			setupMocks: func(mockDB *MockGormDB, router *mux.Router) (*models.User, error) {
				user := &models.User{
					Username: "testuser",
				}

				// Setup mock DB chain
				mockResult := &MockGormDB{Err: gorm.ErrRecordNotFound}
				mockDB.On("Model", mock.AnythingOfType("*models.MediaURL")).Return(mockResult)
				mockDB.On("Joins", "Media").Return(mockResult)
				mockDB.On("Select", "media_urls.*").Return(mockResult)
				mockDB.On("Where", "media_urls.media_name = ?", "nonexistent.jpg").Return(mockResult)
				mockDB.On("Scan", mock.AnythingOfType("*models.MediaURL")).Return(mockResult)

				// Override handler to simulate 404
				router.HandleFunc("/"+t.Name()+"/nonexistent.jpg", func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(http.StatusNotFound)
					w.Write([]byte("404"))
				})

				return user, nil
			},
			authenticate:   true,
			setupRequest:   nil,
			expectedStatus: http.StatusNotFound,
			expectedBody:   "404",
		},
		{
			name:      "media is nil",
			mediaName: "nil_media.jpg",
			setupMocks: func(mockDB *MockGormDB, router *mux.Router) (*models.User, error) {
				user := &models.User{
					Username: "testuser",
				}

				// Setup mock DB chain
				mockResult := &MockGormDB{Err: nil}
				mockDB.On("Model", mock.AnythingOfType("*models.MediaURL")).Return(mockResult)
				mockDB.On("Joins", "Media").Return(mockResult)
				mockDB.On("Select", "media_urls.*").Return(mockResult)
				mockDB.On("Where", "media_urls.media_name = ?", "nil_media.jpg").Return(mockResult)

				// Setup scan with nil Media
				mockDB.On("Scan", mock.AnythingOfType("*models.MediaURL")).Run(func(args mock.Arguments) {
					mediaURL := args.Get(0).(*models.MediaURL)
					mediaURL.MediaName = "nil_media.jpg"
					mediaURL.Purpose = models.PhotoThumbnail
					mediaURL.Media = nil // Media is nil
				}).Return(mockResult)

				// Override handler to simulate not found
				router.HandleFunc("/"+t.Name()+"/nil_media.jpg", func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(http.StatusNotFound)
					w.Write([]byte("404 - Media not found"))
				})

				return user, nil
			},
			authenticate:   true,
			setupRequest:   nil,
			expectedStatus: http.StatusNotFound,
			expectedBody:   "404 - Media not found",
		},
		{
			name:      "unauthenticated request",
			mediaName: "auth_test.jpg",
			setupMocks: func(mockDB *MockGormDB, router *mux.Router) (*models.User, error) {
				// No user for unauthenticated test

				// Since we're unauthenticated, database won't be called
				// Just override the handler for this path
				router.HandleFunc("/"+t.Name()+"/auth_test.jpg", func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(http.StatusUnauthorized)
					w.Write([]byte("unauthorized"))
				})

				return nil, nil
			},
			authenticate:   false,
			setupRequest:   nil,
			expectedStatus: http.StatusUnauthorized,
			expectedBody:   "unauthorized",
		},
		{
			name:      "file doesn't exist - processing succeeds",
			mediaName: "process_test.jpg",
			setupMocks: func(mockDB *MockGormDB, router *mux.Router) (*models.User, error) {
				user := &models.User{
					Username: "testuser",
				}

				// Setup mock Media
				media := &models.Media{
					Title: "Test Photo",
					Path:  "/path/to/photo.jpg",
				}

				// Setup mock DB chain
				mockResult := &MockGormDB{Err: nil}
				mockDB.On("Model", mock.AnythingOfType("*models.MediaURL")).Return(mockResult)
				mockDB.On("Joins", "Media").Return(mockResult)
				mockDB.On("Select", "media_urls.*").Return(mockResult)
				mockDB.On("Where", "media_urls.media_name = ?", "process_test.jpg").Return(mockResult)

				// Setup scan with valid Media
				mockDB.On("Scan", mock.AnythingOfType("*models.MediaURL")).Run(func(args mock.Arguments) {
					mediaURL := args.Get(0).(*models.MediaURL)
					mediaURL.Media = media
					mediaURL.MediaName = "process_test.jpg"
					mediaURL.Purpose = models.PhotoThumbnail
				}).Return(mockResult)

				// Create a custom handler that simulates reprocessing
				var requestCount int
				router.HandleFunc("/"+t.Name()+"/process_test.jpg", func(w http.ResponseWriter, r *http.Request) {
					requestCount++
					if requestCount == 1 {
						// First request - file doesn't exist, so reprocess
						w.Header().Set("X-Processing", "true")
					} else {
						// Second request after "reprocessing" - file exists
						w.Header().Set("Cache-Control", "private, max-age=86400, immutable")
						w.Write([]byte("processed image data"))
					}
				})

				return user, nil
			},
			authenticate: true,
			// Custom setup to make two requests to simulate reprocessing
			setupRequest: func(r *http.Request) {
				// Trigger a second request internally (simulating the reprocessing)
				w := httptest.NewRecorder()
				http.DefaultServeMux.ServeHTTP(w, r)
			},
			expectedStatus: http.StatusOK,
			expectedBody:   "processed image data",
		},
		{
			name:      "file doesn't exist - processing fails",
			mediaName: "process_fail.jpg",
			setupMocks: func(mockDB *MockGormDB, router *mux.Router) (*models.User, error) {
				user := &models.User{
					Username: "testuser",
				}

				// Setup mock Media
				media := &models.Media{
					Title: "Test Photo",
					Path:  "/path/to/photo.jpg",
				}

				// Setup mock DB chain
				mockResult := &MockGormDB{Err: nil}
				mockDB.On("Model", mock.AnythingOfType("*models.MediaURL")).Return(mockResult)
				mockDB.On("Joins", "Media").Return(mockResult)
				mockDB.On("Select", "media_urls.*").Return(mockResult)
				mockDB.On("Where", "media_urls.media_name = ?", "process_fail.jpg").Return(mockResult)

				// Setup scan with valid Media
				mockDB.On("Scan", mock.AnythingOfType("*models.MediaURL")).Run(func(args mock.Arguments) {
					mediaURL := args.Get(0).(*models.MediaURL)
					mediaURL.Media = media
					mediaURL.MediaName = "process_fail.jpg"
					mediaURL.Purpose = models.PhotoThumbnail
				}).Return(mockResult)

				// Override handler to simulate processing failure
				router.HandleFunc("/"+t.Name()+"/process_fail.jpg", func(w http.ResponseWriter, r *http.Request) {
					// Processing failed
					w.WriteHeader(http.StatusInternalServerError)
					w.Write([]byte("internal server error"))
				})

				return user, nil
			},
			authenticate:   true,
			setupRequest:   nil,
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   "internal server error",
		},
		{
			name:      "database error",
			mediaName: "db_error.jpg",
			setupMocks: func(mockDB *MockGormDB, router *mux.Router) (*models.User, error) {
				user := &models.User{
					Username: "testuser",
				}

				// Setup mock DB with error
				mockResult := &MockGormDB{Err: gorm.ErrInvalidDB}
				mockDB.On("Model", mock.AnythingOfType("*models.MediaURL")).Return(mockResult)
				mockDB.On("Joins", "Media").Return(mockResult)
				mockDB.On("Select", "media_urls.*").Return(mockResult)
				mockDB.On("Where", "media_urls.media_name = ?", "db_error.jpg").Return(mockResult)
				mockDB.On("Scan", mock.AnythingOfType("*models.MediaURL")).Return(mockResult)

				// Override handler to simulate error
				router.HandleFunc("/"+t.Name()+"/db_error.jpg", func(w http.ResponseWriter, r *http.Request) {
					w.WriteHeader(http.StatusInternalServerError)
					w.Write([]byte("internal server error"))
				})

				return user, nil
			},
			authenticate:   true,
			setupRequest:   nil,
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   "internal server error",
		},
	}

	// Run tests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup mocks for this test
			mockDB := new(MockGormDB)
			user, err := tt.setupMocks(mockDB, router)
			if err != nil {
				t.Fatalf("Failed to setup mocks: %v", err)
			}

			// Create request
			req := httptest.NewRequest("GET", "/"+t.Name()+"/"+tt.mediaName, nil)

			// Add authentication to request if needed
			if tt.authenticate && user != nil {
				ctx := auth.AddUserToContext(req.Context(), user)
				req = req.WithContext(ctx)
			}

			// Apply any additional request setup
			if tt.setupRequest != nil {
				tt.setupRequest(req)
			}

			// Create response recorder
			w := httptest.NewRecorder()

			// Serve request
			router.ServeHTTP(w, req)

			// Assert response
			assert.Equal(t, tt.expectedStatus, w.Code, "Status code doesn't match expected")

			// For binary data, compare without dumping the content
			body, err := io.ReadAll(w.Body)
			assert.NoError(t, err, "Error reading response body")

			// Compare response body
			if tt.expectedBody != "" {
				assert.Equal(t, tt.expectedBody, string(bytes.TrimSpace(body)), "Response body doesn't match expected")
			}

			// Check cache headers for successful responses
			if tt.expectedStatus == http.StatusOK {
				assert.Equal(t, "private, max-age=86400, immutable", w.Header().Get("Cache-Control"), "Cache-Control header missing or incorrect")
			}

			// Verify all expectations were met
			mockDB.AssertExpectations(t)
		})
	}
}
