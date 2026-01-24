package resolvers

import (
	"context"
	"testing"
	"time"

	"github.com/kkovaletp/photoview/api/graphql/auth"
	"github.com/kkovaletp/photoview/api/graphql/models"
	"github.com/kkovaletp/photoview/api/test_utils"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

func TestMain(m *testing.M) {
	test_utils.IntegrationTestRun(m)
}

func TestShareToken(t *testing.T) {
	test_utils.FilesystemTest(t)
	db := test_utils.DatabaseTest(t)
	pass := "1234"
	user, err := models.RegisterUser(db, "test_user", &pass, true)
	require.NoError(t, err)

	hashBytes, err := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
	require.NoError(t, err)
	hashedPassword := string(hashBytes)

	now := time.Now()
	expiredTime := now.Add(-24 * time.Hour)
	expiredTime = time.Date(
		expiredTime.Year(),
		expiredTime.Month(),
		expiredTime.Day(),
		expiredTime.Hour(),
		expiredTime.Minute(),
		expiredTime.Second(),
		0,
		time.UTC,
	)
	futureTime := now.Add(24 * time.Hour)
	futureTime = time.Date(
		futureTime.Year(),
		futureTime.Month(),
		futureTime.Day(),
		futureTime.Hour(),
		futureTime.Minute(),
		futureTime.Second(),
		0,
		time.UTC,
	)

	require.NoError(t, db.AutoMigrate(&models.ShareToken{}))

	testDataList := []models.ShareToken{
		{
			Value:   "VALID_NO_PASSWORD",
			OwnerID: user.ID,
			Expire:  &futureTime,
		},
		{
			Value:    "VALID_WITH_PASSWORD",
			OwnerID:  user.ID,
			Expire:   &futureTime,
			Password: &hashedPassword,
		},
		{
			Value:   "EXPIRED_TOKEN",
			OwnerID: user.ID,
			Expire:  &expiredTime,
		},
		{
			Value:    "EXPIRED_WITH_PASSWORD",
			OwnerID:  user.ID,
			Expire:   &expiredTime,
			Password: &hashedPassword,
		},
		{
			Value:   "NO_EXPIRE",
			OwnerID: user.ID,
		},
	}
	require.NoError(t, db.Create(&testDataList).Error)

	tests := []struct {
		name        string
		credentials models.ShareTokenCredentials
		wantErr     bool
		wantErrMsg  string
	}{
		{
			name: "Token not found",
			credentials: models.ShareTokenCredentials{
				Token: "NOT_EXIST",
			},
			wantErr:    true,
			wantErrMsg: "share not found",
		},
		{
			name: "Valid token no password",
			credentials: models.ShareTokenCredentials{
				Token: "VALID_NO_PASSWORD",
			},
			wantErr: false,
		},
		{
			name: "Valid token with correct password",
			credentials: models.ShareTokenCredentials{
				Token:    "VALID_WITH_PASSWORD",
				Password: &pass,
			},
			wantErr: false,
		},
		{
			name: "Valid token with wrong password",
			credentials: models.ShareTokenCredentials{
				Token: "VALID_WITH_PASSWORD",
			},
			wantErr:    true,
			wantErrMsg: "unauthorized",
		},
		{
			name: "Expired token",
			credentials: models.ShareTokenCredentials{
				Token: "EXPIRED_TOKEN",
			},
			wantErr:    true,
			wantErrMsg: "share expired",
		},
		{
			name: "Expired token with password",
			credentials: models.ShareTokenCredentials{
				Token:    "EXPIRED_WITH_PASSWORD",
				Password: &pass,
			},
			wantErr:    true,
			wantErrMsg: "share expired",
		},
		{
			name: "Token without expiration",
			credentials: models.ShareTokenCredentials{
				Token: "NO_EXPIRE",
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &queryResolver{
				Resolver: &Resolver{
					database: db,
				},
			}
			got, err := r.ShareToken(context.Background(), tt.credentials)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.wantErrMsg != "" {
					assert.Contains(t, err.Error(), tt.wantErrMsg)
				}
				assert.Nil(t, got)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, got)
				assert.Equal(t, tt.credentials.Token, got.Value)
			}
		})
	}
}

func TestSetExpireShareToken(t *testing.T) {
	test_utils.FilesystemTest(t)
	db := test_utils.DatabaseTest(t)
	pass := "1234"
	user, err := models.RegisterUser(db, "test_user", &pass, true)
	require.NoError(t, err)

	require.NoError(t, db.AutoMigrate(&models.ShareToken{}))

	now := time.Now()
	futureTime := now.Add(24 * time.Hour)
	futureTime = time.Date(
		futureTime.Year(),
		futureTime.Month(),
		futureTime.Day(),
		futureTime.Hour(),
		futureTime.Minute(),
		futureTime.Second(),
		0,
		time.UTC,
	)

	testToken := models.ShareToken{
		Value:   "TEST_TOKEN",
		OwnerID: user.ID,
		Expire:  &futureTime,
	}
	require.NoError(t, db.Create(&testToken).Error)

	newExpireTime := now.Add(48 * time.Hour)
	newExpireTime = time.Date(
		newExpireTime.Year(),
		newExpireTime.Month(),
		newExpireTime.Day(),
		23,
		59,
		59,
		0,
		time.UTC,
	)

	tests := []struct {
		name       string
		ctx        context.Context
		token      string
		expire     *time.Time
		wantErr    bool
		wantErrMsg string
		checkFunc  func(t *testing.T, result *models.ShareToken)
	}{
		{
			name:       "Unauthorized - no user in context",
			ctx:        context.Background(),
			token:      "TEST_TOKEN",
			expire:     &newExpireTime,
			wantErr:    true,
			wantErrMsg: "unauthorized",
		},
		{
			name:    "Set new expiration",
			ctx:     auth.AddUserToContext(context.Background(), user),
			token:   "TEST_TOKEN",
			expire:  &newExpireTime,
			wantErr: false,
			checkFunc: func(t *testing.T, result *models.ShareToken) {
				assert.NotNil(t, result.Expire)
				assert.Equal(t, newExpireTime, *result.Expire)
			},
		},
		{
			name:    "Clear expiration (set to nil)",
			ctx:     auth.AddUserToContext(context.Background(), user),
			token:   "TEST_TOKEN",
			expire:  nil,
			wantErr: false,
			checkFunc: func(t *testing.T, result *models.ShareToken) {
				assert.Nil(t, result.Expire)
			},
		},
		{
			name:       "Token not found",
			ctx:        auth.AddUserToContext(context.Background(), user),
			token:      "NONEXISTENT",
			expire:     &newExpireTime,
			wantErr:    true,
			wantErrMsg: "share not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &mutationResolver{
				Resolver: &Resolver{
					database: db,
				},
			}
			got, err := r.SetExpireShareToken(tt.ctx, tt.token, tt.expire)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.wantErrMsg != "" {
					assert.Contains(t, err.Error(), tt.wantErrMsg)
				}
				assert.Nil(t, got)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, got)
				if tt.checkFunc != nil {
					tt.checkFunc(t, got)
				}
			}
		})
	}
}

func TestShareTokenValidatePassword(t *testing.T) {
	test_utils.FilesystemTest(t)
	db := test_utils.DatabaseTest(t)
	pass := "1234"
	user, err := models.RegisterUser(db, "test_user", &pass, true)
	require.NoError(t, err)

	hashBytes, err := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
	require.NoError(t, err)
	hashedPassword := string(hashBytes)

	now := time.Now()
	expiredTime := now.Add(-24 * time.Hour)
	expiredTime = time.Date(
		expiredTime.Year(),
		expiredTime.Month(),
		expiredTime.Day(),
		expiredTime.Hour(),
		expiredTime.Minute(),
		expiredTime.Second(),
		0,
		time.UTC,
	)
	futureTime := now.Add(24 * time.Hour)
	futureTime = time.Date(
		futureTime.Year(),
		futureTime.Month(),
		futureTime.Day(),
		futureTime.Hour(),
		futureTime.Minute(),
		futureTime.Second(),
		0,
		time.UTC,
	)

	require.NoError(t, db.AutoMigrate(&models.ShareToken{}))

	testDataList := []models.ShareToken{
		{
			Value:   "NOT_EXIST_TOKEN",
			OwnerID: user.ID,
			Expire:  &expiredTime,
		},
		{
			Value:    "CORRECT_PASSWORD",
			OwnerID:  user.ID,
			Expire:   &futureTime,
			Password: &hashedPassword,
		},
	}
	require.NoError(t, db.Create(&testDataList).Error)

	tests := []struct {
		name       string
		token      string
		password   *string
		wantResult bool
		wantErr    bool
		wantErrMsg string
	}{
		{
			name:       "Token not found",
			token:      "TOKEN_DOES_NOT_EXIST",
			wantResult: false,
			wantErr:    true,
			wantErrMsg: "share not found",
		},
		{
			name:       "Token expired",
			token:      "NOT_EXIST_TOKEN",
			wantResult: false,
			wantErr:    true,
			wantErrMsg: "share expired",
		},
		{
			name:       "Correct password",
			token:      "CORRECT_PASSWORD",
			password:   &pass,
			wantResult: true,
			wantErr:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &queryResolver{
				Resolver: &Resolver{
					database: db,
				},
			}
			credentials := models.ShareTokenCredentials{
				Token:    tt.token,
				Password: tt.password,
			}
			got, err := r.ShareTokenValidatePassword(context.Background(), credentials)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.wantErrMsg != "" {
					assert.Contains(t, err.Error(), tt.wantErrMsg)
				}
			} else {
				assert.NoError(t, err)
			}
			assert.Equal(t, tt.wantResult, got)
		})
	}
}

func TestShareAlbum(t *testing.T) {
	test_utils.FilesystemTest(t)
	db := test_utils.DatabaseTest(t)
	pass := "1234"
	user, err := models.RegisterUser(db, "test_user", &pass, true)
	require.NoError(t, err)

	require.NoError(t, db.AutoMigrate(&models.Album{}))

	album := models.Album{
		Title: "Test Album",
		Path:  "/test",
	}
	require.NoError(t, db.Create(&album).Error)
	require.NoError(t, db.Model(&user).Association("Albums").Append(&album))

	now := time.Now()
	futureTime := now.Add(24 * time.Hour)
	futureTime = time.Date(
		futureTime.Year(),
		futureTime.Month(),
		futureTime.Day(),
		23,
		59,
		59,
		0,
		time.UTC,
	)
	sharePassword := "sharepass"

	tests := []struct {
		name       string
		ctx        context.Context
		albumID    int
		expire     *time.Time
		password   *string
		wantErr    bool
		wantErrMsg string
	}{
		{
			name:       "Unauthorized - no user in context",
			ctx:        context.Background(),
			albumID:    album.ID,
			wantErr:    true,
			wantErrMsg: "unauthorized",
		},
		{
			name:    "Create album share with expiration",
			ctx:     auth.AddUserToContext(context.Background(), user),
			albumID: album.ID,
			expire:  &futureTime,
			wantErr: false,
		},
		{
			name:     "Create album share with password",
			ctx:      auth.AddUserToContext(context.Background(), user),
			albumID:  album.ID,
			password: &sharePassword,
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &mutationResolver{
				Resolver: &Resolver{
					database: db,
				},
			}
			got, err := r.ShareAlbum(tt.ctx, tt.albumID, tt.expire, tt.password)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.wantErrMsg != "" {
					assert.Contains(t, err.Error(), tt.wantErrMsg)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, got)
				assert.NotEmpty(t, got.Value)
				assert.Equal(t, album.ID, *got.AlbumID)
			}
		})
	}
}

func TestShareMedia(t *testing.T) {
	test_utils.FilesystemTest(t)
	db := test_utils.DatabaseTest(t)
	pass := "1234"
	user, err := models.RegisterUser(db, "test_user", &pass, true)
	require.NoError(t, err)

	require.NoError(t, db.AutoMigrate(&models.Album{}, &models.Media{}))

	album := models.Album{
		Title: "Test Album",
		Path:  "/test",
	}
	require.NoError(t, db.Create(&album).Error)
	require.NoError(t, db.Model(&user).Association("Albums").Append(&album))

	media := models.Media{
		Title:   "Test Photo",
		Path:    "/test/photo.jpg",
		AlbumID: album.ID,
	}
	require.NoError(t, db.Create(&media).Error)

	tests := []struct {
		name       string
		ctx        context.Context
		mediaID    int
		wantErr    bool
		wantErrMsg string
	}{
		{
			name:       "Unauthorized - no user in context",
			ctx:        context.Background(),
			mediaID:    media.ID,
			wantErr:    true,
			wantErrMsg: "unauthorized",
		},
		{
			name:    "Create media share",
			ctx:     auth.AddUserToContext(context.Background(), user),
			mediaID: media.ID,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &mutationResolver{
				Resolver: &Resolver{
					database: db,
				},
			}
			got, err := r.ShareMedia(tt.ctx, tt.mediaID, nil, nil)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.wantErrMsg != "" {
					assert.Contains(t, err.Error(), tt.wantErrMsg)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, got)
				assert.NotEmpty(t, got.Value)
				assert.Equal(t, media.ID, *got.MediaID)
			}
		})
	}
}

func TestDeleteShareToken(t *testing.T) {
	test_utils.FilesystemTest(t)
	db := test_utils.DatabaseTest(t)
	pass := "1234"
	user, err := models.RegisterUser(db, "test_user", &pass, true)
	require.NoError(t, err)

	require.NoError(t, db.AutoMigrate(&models.ShareToken{}))

	token := models.ShareToken{
		Value:   "DELETE_ME",
		OwnerID: user.ID,
	}
	require.NoError(t, db.Create(&token).Error)

	tests := []struct {
		name       string
		ctx        context.Context
		token      string
		wantErr    bool
		wantErrMsg string
	}{
		{
			name:       "Unauthorized - no user in context",
			ctx:        context.Background(),
			token:      "DELETE_ME",
			wantErr:    true,
			wantErrMsg: "unauthorized",
		},
		{
			name:    "Delete share token",
			ctx:     auth.AddUserToContext(context.Background(), user),
			token:   "DELETE_ME",
			wantErr: false,
		},
		{
			name:       "Token not found",
			ctx:        auth.AddUserToContext(context.Background(), user),
			token:      "NONEXISTENT",
			wantErr:    true,
			wantErrMsg: "share not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &mutationResolver{
				Resolver: &Resolver{
					database: db,
				},
			}
			got, err := r.DeleteShareToken(tt.ctx, tt.token)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.wantErrMsg != "" {
					assert.Contains(t, err.Error(), tt.wantErrMsg)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, got)
				assert.Equal(t, tt.token, got.Value)
			}
		})
	}
}

func TestProtectShareToken(t *testing.T) {
	test_utils.FilesystemTest(t)
	db := test_utils.DatabaseTest(t)
	pass := "1234"
	user, err := models.RegisterUser(db, "test_user", &pass, true)
	require.NoError(t, err)

	require.NoError(t, db.AutoMigrate(&models.ShareToken{}))

	token := models.ShareToken{
		Value:   "PROTECT_ME",
		OwnerID: user.ID,
	}
	require.NoError(t, db.Create(&token).Error)

	sharePassword := "secret"

	tests := []struct {
		name       string
		ctx        context.Context
		token      string
		password   *string
		wantErr    bool
		wantErrMsg string
		checkFunc  func(t *testing.T, result *models.ShareToken)
	}{
		{
			name:       "Unauthorized - no user in context",
			ctx:        context.Background(),
			token:      "PROTECT_ME",
			password:   &sharePassword,
			wantErr:    true,
			wantErrMsg: "unauthorized",
		},
		{
			name:     "Set password protection",
			ctx:      auth.AddUserToContext(context.Background(), user),
			token:    "PROTECT_ME",
			password: &sharePassword,
			wantErr:  false,
			checkFunc: func(t *testing.T, result *models.ShareToken) {
				assert.NotNil(t, result.Password)
				assert.NotEmpty(t, *result.Password)
			},
		},
		{
			name:     "Remove password protection",
			ctx:      auth.AddUserToContext(context.Background(), user),
			token:    "PROTECT_ME",
			password: nil,
			wantErr:  false,
			checkFunc: func(t *testing.T, result *models.ShareToken) {
				assert.Nil(t, result.Password)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &mutationResolver{
				Resolver: &Resolver{
					database: db,
				},
			}
			got, err := r.ProtectShareToken(tt.ctx, tt.token, tt.password)
			if tt.wantErr {
				assert.Error(t, err)
				if tt.wantErrMsg != "" {
					assert.Contains(t, err.Error(), tt.wantErrMsg)
				}
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, got)
				if tt.checkFunc != nil {
					tt.checkFunc(t, got)
				}
			}
		})
	}
}

func TestHasPassword(t *testing.T) {
	pass := "secret"
	hashBytes, err := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
	require.NoError(t, err)
	hashedPassword := string(hashBytes)

	tests := []struct {
		name     string
		token    *models.ShareToken
		expected bool
	}{
		{
			name: "Token with password",
			token: &models.ShareToken{
				Value:    "TEST",
				Password: &hashedPassword,
			},
			expected: true,
		},
		{
			name: "Token without password",
			token: &models.ShareToken{
				Value:    "TEST",
				Password: nil,
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &shareTokenResolver{}
			got, err := r.HasPassword(context.Background(), tt.token)
			assert.NoError(t, err)
			assert.Equal(t, tt.expected, got)
		})
	}
}
