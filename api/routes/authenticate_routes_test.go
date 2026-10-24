package routes

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/kkovaletp/photoview/api/graphql/auth"
	"github.com/kkovaletp/photoview/api/graphql/models"
	"github.com/kkovaletp/photoview/api/graphql/models/actions"
	"github.com/kkovaletp/photoview/api/test_utils"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

func TestAuthenticateRoute(t *testing.T) {
	const imageData = "IMAGE DATA"
	const albumData = "ALBUM DATA"

	db := test_utils.DatabaseTest(t)

	user, err := models.RegisterUser(db, "username", nil, false)
	if !assert.NoError(t, err) {
		return
	}

	album := models.Album{
		Title: "my_album",
		Path:  "/photos",
	}

	if !assert.NoError(t, db.Model(&user).Association("Albums").Append(&album)) {
		return
	}

	media := models.Media{
		Title:   "my_media",
		Path:    "/photos/image.jpg",
		AlbumID: album.ID,
	}

	if !assert.NoError(t, db.Save(&media).Error) {
		return
	}

	t.Run("Authenticate Media", func(t *testing.T) {
		t.Run("Authorized request", func(t *testing.T) {
			req := httptest.NewRequest("GET", "/photo/image.jpg", strings.NewReader(imageData))
			ctx := auth.AddUserToContext(req.Context(), user)
			req = req.WithContext(ctx)

			success, responseMessage, responseStatus, err := authenticateMedia(&media, db, req)

			assert.NoError(t, err)
			assert.True(t, success)
			assert.Equal(t, responseMessage, "success")
			assert.Equal(t, responseStatus, http.StatusAccepted)
		})

		t.Run("Request without access token", func(t *testing.T) {
			req := httptest.NewRequest("GET", "/photo/image.jpg", strings.NewReader(imageData))

			success, responseMessage, responseStatus, err := authenticateMedia(&media, db, req)

			assert.Error(t, err)
			assert.False(t, success)
			assert.Equal(t, responseMessage, "unauthorized")
			assert.Equal(t, responseStatus, http.StatusForbidden)
		})

		expire := time.Now().Add(time.Hour * 24 * 30)
		tokenPassword := "token-password-123"
		shareToken, err := actions.AddMediaShare(db, user, media.ID, &expire, &tokenPassword, nil)
		if !assert.NoError(t, err) {
			return
		}

		t.Run("Request with share token", func(t *testing.T) {
			url := fmt.Sprintf("/photo/image.jpg?token=%s", shareToken.Value)
			req := httptest.NewRequest("GET", url, strings.NewReader(imageData))

			cookie := http.Cookie{
				Name:  fmt.Sprintf("share-token-pw-%s", shareToken.Value),
				Value: tokenPassword,
			}
			req.AddCookie(&cookie)

			success, responseMessage, responseStatus, err := authenticateMedia(&media, db, req)

			assert.NoError(t, err)
			assert.True(t, success)
			assert.Equal(t, "success", responseMessage)
			assert.Equal(t, http.StatusAccepted, responseStatus)
		})

		t.Run("Request with invalid share token", func(t *testing.T) {
			url := fmt.Sprintf("/photo/image.jpg?token=%s", "invalid-token")
			req := httptest.NewRequest("GET", url, strings.NewReader(imageData))
			// Even if a cookie is sent, the token is invalid
			cookie := http.Cookie{
				Name:  fmt.Sprintf("share-token-pw-%s", "invalid-token"),
				Value: "whatever",
			}
			req.AddCookie(&cookie)
			success, responseMessage, responseStatus, err := authenticateMedia(&media, db, req)
			assert.Error(t, err)
			assert.False(t, success)
			assert.Equal(t, "unauthorized", responseMessage)
			assert.Equal(t, http.StatusForbidden, responseStatus)
		})

		t.Run("Request with share token but no password cookie", func(t *testing.T) {
			shareToken, err := actions.AddMediaShare(db, user, media.ID, &expire, &tokenPassword, nil)
			assert.NoError(t, err)
			url := fmt.Sprintf("/photo/image.jpg?token=%s", shareToken.Value)
			req := httptest.NewRequest("GET", url, strings.NewReader(imageData))
			// No cookie provided
			success, responseMessage, responseStatus, err := authenticateMedia(&media, db, req)
			assert.Error(t, err)
			assert.False(t, success)
			assert.Equal(t, "unauthorized", responseMessage)
			assert.Equal(t, http.StatusForbidden, responseStatus)
		})

		t.Run("Request with share token and wrong password", func(t *testing.T) {
			shareToken, err := actions.AddMediaShare(db, user, media.ID, &expire, &tokenPassword, nil)
			assert.NoError(t, err)
			url := fmt.Sprintf("/photo/image.jpg?token=%s", shareToken.Value)
			req := httptest.NewRequest("GET", url, strings.NewReader(imageData))
			cookie := http.Cookie{
				Name:  fmt.Sprintf("share-token-pw-%s", shareToken.Value),
				Value: "incorrect-password",
			}
			req.AddCookie(&cookie)
			success, responseMessage, responseStatus, err := authenticateMedia(&media, db, req)
			assert.Error(t, err)
			assert.False(t, success)
			assert.Equal(t, "unauthorized", responseMessage)
			assert.Equal(t, http.StatusForbidden, responseStatus)
		})

		t.Run("Request with expired share token", func(t *testing.T) {
			expired := time.Now().Add(-time.Hour)
			shareToken, err := actions.AddMediaShare(db, user, media.ID, &expired, &tokenPassword, nil)
			assert.NoError(t, err)
			url := fmt.Sprintf("/photo/image.jpg?token=%s", shareToken.Value)
			req := httptest.NewRequest("GET", url, strings.NewReader(imageData))
			cookie := http.Cookie{
				Name:  fmt.Sprintf("share-token-pw-%s", shareToken.Value),
				Value: tokenPassword,
			}
			req.AddCookie(&cookie)
			success, responseMessage, responseStatus, err := authenticateMedia(&media, db, req)
			assert.Error(t, err)
			assert.False(t, success)
			assert.Equal(t, "unauthorized", responseMessage)
			assert.Equal(t, http.StatusForbidden, responseStatus)
		})
	})

	t.Run("Authenticate Album", func(t *testing.T) {
		t.Run("Authorized request", func(t *testing.T) {
			req := httptest.NewRequest("GET", "/download/album/1", strings.NewReader(albumData))
			ctx := auth.AddUserToContext(req.Context(), user)
			req = req.WithContext(ctx)

			success, responseMessage, responseStatus, err := authenticateAlbum(&album, db, req)

			assert.NoError(t, err)
			assert.True(t, success)
			assert.Equal(t, "success", responseMessage)
			assert.Equal(t, http.StatusAccepted, responseStatus)
		})

		t.Run("Request without access token", func(t *testing.T) {
			req := httptest.NewRequest("GET", "/download/album/1", strings.NewReader(albumData))

			success, responseMessage, responseStatus, err := authenticateAlbum(&album, db, req)

			assert.Error(t, err)
			assert.False(t, success)
			assert.Equal(t, "unauthorized", responseMessage)
			assert.Equal(t, http.StatusForbidden, responseStatus)
		})

		expire := time.Now().Add(time.Hour * 24 * 30)
		tokenPassword := "token-password-123"
		shareToken, err := actions.AddAlbumShare(db, user, album.ID, &expire, &tokenPassword, nil)
		if !assert.NoError(t, err) {
			return
		}

		t.Run("Request with share token", func(t *testing.T) {
			url := fmt.Sprintf("/download/album/1?token=%s", shareToken.Value)
			req := httptest.NewRequest("GET", url, strings.NewReader(albumData))

			cookie := http.Cookie{
				Name:  fmt.Sprintf("share-token-pw-%s", shareToken.Value),
				Value: tokenPassword,
			}
			req.AddCookie(&cookie)

			success, responseMessage, responseStatus, err := authenticateAlbum(&album, db, req)

			assert.NoError(t, err)
			assert.True(t, success)
			assert.Equal(t, "success", responseMessage)
			assert.Equal(t, http.StatusAccepted, responseStatus)
		})

		t.Run("Request with invalid album share token", func(t *testing.T) {
			url := fmt.Sprintf("/download/album/1?token=%s", "invalid-token")
			req := httptest.NewRequest("GET", url, strings.NewReader(albumData))
			cookie := http.Cookie{
				Name:  fmt.Sprintf("share-token-pw-%s", "invalid-token"),
				Value: "whatever",
			}
			req.AddCookie(&cookie)
			success, responseMessage, responseStatus, err := authenticateAlbum(&album, db, req)
			assert.Error(t, err)
			assert.False(t, success)
			assert.Equal(t, "unauthorized", responseMessage)
			assert.Equal(t, http.StatusForbidden, responseStatus)
		})

		t.Run("Request with album share token but no password cookie", func(t *testing.T) {
			shareToken, err := actions.AddAlbumShare(db, user, album.ID, &expire, &tokenPassword, nil)
			assert.NoError(t, err)
			url := fmt.Sprintf("/download/album/1?token=%s", shareToken.Value)
			req := httptest.NewRequest("GET", url, strings.NewReader(albumData))
			// No cookie provided
			success, responseMessage, responseStatus, err := authenticateAlbum(&album, db, req)
			assert.Error(t, err)
			assert.False(t, success)
			assert.Equal(t, "unauthorized", responseMessage)
			assert.Equal(t, http.StatusForbidden, responseStatus)
		})

		t.Run("Request with album share token and wrong password", func(t *testing.T) {
			shareToken, err := actions.AddAlbumShare(db, user, album.ID, &expire, &tokenPassword, nil)
			assert.NoError(t, err)
			url := fmt.Sprintf("/download/album/1?token=%s", shareToken.Value)
			req := httptest.NewRequest("GET", url, strings.NewReader(albumData))
			cookie := http.Cookie{
				Name:  fmt.Sprintf("share-token-pw-%s", shareToken.Value),
				Value: "incorrect-password",
			}
			req.AddCookie(&cookie)
			success, responseMessage, responseStatus, err := authenticateAlbum(&album, db, req)
			assert.Error(t, err)
			assert.False(t, success)
			assert.Equal(t, "unauthorized", responseMessage)
			assert.Equal(t, http.StatusForbidden, responseStatus)
		})

		t.Run("Request with expired album share token", func(t *testing.T) {
			expired := time.Now().Add(-time.Hour)
			shareToken, err := actions.AddAlbumShare(db, user, album.ID, &expired, &tokenPassword, nil)
			assert.NoError(t, err)
			url := fmt.Sprintf("/download/album/1?token=%s", shareToken.Value)
			req := httptest.NewRequest("GET", url, strings.NewReader(albumData))
			cookie := http.Cookie{
				Name:  fmt.Sprintf("share-token-pw-%s", shareToken.Value),
				Value: tokenPassword,
			}
			req.AddCookie(&cookie)
			success, responseMessage, responseStatus, err := authenticateAlbum(&album, db, req)
			assert.Error(t, err)
			assert.False(t, success)
			assert.Equal(t, "unauthorized", responseMessage)
			assert.Equal(t, http.StatusForbidden, responseStatus)
		})
	})
}

func TestExplicitShareTokenTakesPriorityOverSession(t *testing.T) {
	db := test_utils.DatabaseTest(t)

	owner, err := models.RegisterUser(
		db, "share-precedence-owner", nil, false,
	)
	require.NoError(t, err)

	other, err := models.RegisterUser(
		db, "share-precedence-other", nil, false,
	)
	require.NoError(t, err)

	root := models.Album{
		Title: "Shared root",
		Path:  "/share-precedence/root",
	}
	require.NoError(t, db.Create(&root).Error)
	require.NoError(
		t, db.Model(&root).Association("Owners").Append(owner),
	)

	child := models.Album{
		Title:         "Shared child",
		Path:          "/share-precedence/root/child",
		ParentAlbumID: &root.ID,
	}
	require.NoError(t, db.Create(&child).Error)
	require.NoError(
		t, db.Model(&child).Association("Owners").Append(owner),
	)

	unrelated := models.Album{
		Title: "Unrelated",
		Path:  "/share-precedence/unrelated",
	}
	require.NoError(t, db.Create(&unrelated).Error)
	require.NoError(
		t, db.Model(&unrelated).Association("Owners").Append(owner),
	)

	rootMedia := models.Media{
		Title:    "root.jpg",
		Path:     "/share-precedence/root/root.jpg",
		AlbumID:  root.ID,
		Type:     models.MediaTypePhoto,
		DateShot: time.Now().UTC(),
	}
	require.NoError(t, db.Create(&rootMedia).Error)

	childMedia := models.Media{
		Title:    "child.jpg",
		Path:     "/share-precedence/root/child/child.jpg",
		AlbumID:  child.ID,
		Type:     models.MediaTypePhoto,
		DateShot: time.Now().UTC(),
	}
	require.NoError(t, db.Create(&childMedia).Error)

	const password = "share-password"

	hash, err := bcrypt.GenerateFromPassword(
		[]byte(password), bcrypt.MinCost,
	)
	require.NoError(t, err)
	hashedPassword := string(hash)

	expiredAt := time.Now().UTC().Add(-time.Hour)

	tokens := []models.ShareToken{
		{
			Value:   "precedence-public",
			OwnerID: owner.ID,
			AlbumID: &root.ID,
		},
		{
			Value:    "precedence-protected",
			OwnerID:  owner.ID,
			AlbumID:  &root.ID,
			Password: &hashedPassword,
		},
		{
			Value:   "precedence-expired",
			OwnerID: owner.ID,
			AlbumID: &root.ID,
			Expire:  &expiredAt,
		},
		{
			Value:   "precedence-unrelated",
			OwnerID: owner.ID,
			AlbumID: &unrelated.ID,
		},
		{
			Value:   "precedence-media-only",
			OwnerID: owner.ID,
			MediaID: &rootMedia.ID,
		},
	}

	for i := range tokens {
		require.NoError(t, db.Create(&tokens[i]).Error)
	}

	type authorizeFunc func(*http.Request) (bool, string, int, error)

	endpoints := []struct {
		name            string
		authorize       authorizeFunc
		allowsMediaOnly bool
	}{
		{
			name: "root media",
			authorize: func(r *http.Request) (bool, string, int, error) {
				return authenticateMedia(&rootMedia, db, r)
			},
			allowsMediaOnly: true,
		},
		{
			name: "child media",
			authorize: func(r *http.Request) (bool, string, int, error) {
				return authenticateMedia(&childMedia, db, r)
			},
		},
		{
			name: "root album",
			authorize: func(r *http.Request) (bool, string, int, error) {
				return authenticateAlbum(&root, db, r)
			},
		},
		{
			name: "child album",
			authorize: func(r *http.Request) (bool, string, int, error) {
				return authenticateAlbum(&child, db, r)
			},
		},
	}

	sessions := []struct {
		name string
		user *models.User
	}{
		{name: "signed out"},
		{name: "owner", user: owner},
		{name: "unrelated user", user: other},
	}

	cases := []struct {
		name      string
		query     string
		cookie    string
		hasCookie bool
		allowed   bool
		noToken   bool
		mediaOnly bool
	}{
		{
			name:    "valid unprotected share",
			query:   "?token=precedence-public",
			allowed: true,
		},
		{
			name:      "valid protected share",
			query:     "?token=precedence-protected",
			cookie:    password,
			hasCookie: true,
			allowed:   true,
		},
		{
			name:  "protected share without password",
			query: "?token=precedence-protected",
		},
		{
			name:      "protected share with wrong password",
			query:     "?token=precedence-protected",
			cookie:    "wrong-password",
			hasCookie: true,
		},
		{
			name:  "expired share",
			query: "?token=precedence-expired",
		},
		{
			name:  "invalid share",
			query: "?token=does-not-exist",
		},
		{
			name:  "share for unrelated album",
			query: "?token=precedence-unrelated",
		},
		{
			name:      "media-only share",
			query:     "?token=precedence-media-only",
			mediaOnly: true,
		},
		{
			name:  "empty explicit token",
			query: "?token=",
		},
		{
			name:    "no explicit token",
			noToken: true,
		},
	}

	for _, endpoint := range endpoints {
		t.Run(endpoint.name, func(t *testing.T) {
			for _, session := range sessions {
				t.Run(session.name, func(t *testing.T) {
					for _, tc := range cases {
						t.Run(tc.name, func(t *testing.T) {
							req := httptest.NewRequest(
								http.MethodGet, "/resource"+tc.query, nil,
							)

							if session.user != nil {
								req = req.WithContext(
									auth.AddUserToContext(
										req.Context(), session.user,
									),
								)
							}

							if tc.hasCookie {
								req.AddCookie(&http.Cookie{
									Name: "share-token-pw-" +
										req.URL.Query().Get("token"),
									Value: tc.cookie,
								})
							}

							expected := tc.allowed
							if tc.mediaOnly {
								expected = endpoint.allowsMediaOnly
							}
							if tc.noToken {
								expected = session.user == owner
							}

							ok, message, status, authErr :=
								endpoint.authorize(req)

							require.Equal(t, expected, ok)

							if expected {
								require.NoError(t, authErr)
								assert.Equal(t, "success", message)
								assert.Equal(
									t, http.StatusAccepted, status,
								)
								return
							}

							assert.Equal(
								t, http.StatusForbidden, status,
							)

							if !tc.noToken {
								assert.Error(t, authErr)
								assert.Equal(t, "unauthorized", message)
							}
						})
					}
				})
			}
		})
	}
}
