package utils_test

import (
	"path/filepath"
	"testing"

	"github.com/kkovaletp/photoview/api/utils"
	"github.com/stretchr/testify/assert"
)

// =============================================================================
// GetInt Tests - CRITICAL: Error handling and parsing
// =============================================================================

func TestGetIntValidInteger(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", "25")
	result := utils.EnvAccessLogMaxSize.GetInt()
	assert.Equal(t, 25, result)
}

func TestGetIntEmptyString(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", "")
	result := utils.EnvAccessLogMaxSize.GetInt()
	assert.Equal(t, 0, result)
}

func TestGetIntInvalidInteger(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", "not-a-number")
	result := utils.EnvAccessLogMaxSize.GetInt()
	// Should return 0 on error and log error message
	assert.Equal(t, 0, result)
}

func TestGetIntNegativeInteger(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_FILES", "-1")
	result := utils.EnvAccessLogMaxFiles.GetInt()
	assert.Equal(t, -1, result)
}

func TestGetIntZero(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_DAYS", "0")
	result := utils.EnvAccessLogMaxDays.GetInt()
	assert.Equal(t, 0, result)
}

func TestGetIntUnset(t *testing.T) {
	result := utils.EnvAccessLogMaxSize.GetInt()
	assert.Equal(t, 0, result)
}

// =============================================================================
// AccessLogPath Tests - CRITICAL: Path resolution and error handling
// =============================================================================

func TestAccessLogPathWithValidPath(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("PHOTOVIEW_ACCESS_LOG_PATH", tempDir)

	path, err := utils.AccessLogPath()
	assert.NoError(t, err)
	assert.NotEmpty(t, path)
	assert.Contains(t, path, "access.log")
	// Should be absolute path
	assert.True(t, filepath.IsAbs(path))
}

func TestAccessLogPathWithRelativePath(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_PATH", "./logs")

	path, err := utils.AccessLogPath()
	assert.NoError(t, err)
	assert.NotEmpty(t, path)
	assert.Contains(t, path, "access.log")
	// Should be converted to absolute
	assert.True(t, filepath.IsAbs(path))
}

func TestAccessLogPathEmptyWhenUnset(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_PATH", "")

	path, err := utils.AccessLogPath()
	assert.NoError(t, err)
	assert.Empty(t, path, "Should return empty string when env var is not set")
}

func TestAccessLogPathCleansPath(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_PATH", "./logs/../logs/./")

	path, err := utils.AccessLogPath()
	assert.NoError(t, err)
	// Path should be cleaned (no .. or . segments)
	assert.NotContains(t, path, "..")
	assert.Contains(t, path, "access.log")
}

// =============================================================================
// AccessLogMaxSize Tests - Default and override behavior
// =============================================================================

func TestAccessLogMaxSizeDefaultValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", "")
	result := utils.AccessLogMaxSize()
	assert.Equal(t, 10, result, "Should return default 10MB")
}

func TestAccessLogMaxSizeCustomValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", "50")
	result := utils.AccessLogMaxSize()
	assert.Equal(t, 50, result)
}

func TestAccessLogMaxSizeZeroValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", "0")
	result := utils.AccessLogMaxSize()
	assert.Equal(t, 10, result, "Should return default when set to 0")
}

func TestAccessLogMaxSizeNegativeValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", "-5")
	result := utils.AccessLogMaxSize()
	assert.Equal(t, 10, result, "Should return default for negative values")
}

// =============================================================================
// AccessLogMaxFiles Tests - CRITICAL: Special handling for negative values
// =============================================================================

func TestAccessLogMaxFilesDefaultValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_FILES", "")
	result := utils.AccessLogMaxFiles()
	assert.Equal(t, 5, result, "Should return default 5 files")
}

func TestAccessLogMaxFilesCustomPositiveValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_FILES", "10")
	result := utils.AccessLogMaxFiles()
	assert.Equal(t, 10, result)
}

func TestAccessLogMaxFilesZeroValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_FILES", "0")
	result := utils.AccessLogMaxFiles()
	assert.Equal(t, 5, result, "Should return default 5 when set to 0")
}

func TestAccessLogMaxFilesNegativeValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_FILES", "-1")
	result := utils.AccessLogMaxFiles()
	assert.Equal(t, 0, result, "Negative value means keep all files (return 0)")
}

func TestAccessLogMaxFilesLargeNegativeValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_FILES", "-999")
	result := utils.AccessLogMaxFiles()
	assert.Equal(t, 0, result, "Any negative value means keep all files")
}

// =============================================================================
// AccessLogMaxDays Tests - Default behavior
// =============================================================================

func TestAccessLogMaxDaysDefaultValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_DAYS", "")
	result := utils.AccessLogMaxDays()
	assert.Equal(t, 0, result, "Should return 0 (never delete) by default")
}

func TestAccessLogMaxDaysCustomValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_DAYS", "30")
	result := utils.AccessLogMaxDays()
	assert.Equal(t, 30, result)
}

func TestAccessLogMaxDaysZeroValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_DAYS", "0")
	result := utils.AccessLogMaxDays()
	assert.Equal(t, 0, result, "Zero means never delete old logs")
}

func TestAccessLogMaxDaysNegativeValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_DAYS", "-5")
	result := utils.AccessLogMaxDays()
	assert.Equal(t, 0, result, "Negative values should return default 0")
}

// =============================================================================
// GetBool Tests - Existing function coverage
// =============================================================================

func TestGetBoolTrueValues(t *testing.T) {
	testCases := []string{"1", "true", "True", "TRUE"}

	for _, value := range testCases {
		t.Run(value, func(t *testing.T) {
			t.Setenv("PHOTOVIEW_DEVELOPMENT_MODE", value)
			result := utils.EnvDevelopmentMode.GetBool()
			assert.True(t, result)
		})
	}
}

func TestGetBoolFalseValues(t *testing.T) {
	testCases := []string{"", "0", "false", "False", "FALSE", "no", "invalid"}

	for _, value := range testCases {
		t.Run(value, func(t *testing.T) {
			t.Setenv("PHOTOVIEW_DEVELOPMENT_MODE", value)
			result := utils.EnvDevelopmentMode.GetBool()
			assert.False(t, result)
		})
	}
}

// =============================================================================
// Helper function tests
// =============================================================================

func TestShouldServeUITrue(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "1")
	assert.True(t, utils.ShouldServeUI())
}

func TestShouldServeUIFalse(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "")
	assert.False(t, utils.ShouldServeUI())
}

func TestDevelopmentModeTrue(t *testing.T) {
	t.Setenv("PHOTOVIEW_DEVELOPMENT_MODE", "true")
	assert.True(t, utils.DevelopmentMode())
}

func TestDevelopmentModeFalse(t *testing.T) {
	t.Setenv("PHOTOVIEW_DEVELOPMENT_MODE", "")
	assert.False(t, utils.DevelopmentMode())
}

func TestUIPathCustomPath(t *testing.T) {
	t.Setenv("PHOTOVIEW_UI_PATH", "/custom/ui")
	assert.Equal(t, "/custom/ui", utils.UIPath())
}

func TestUIPathDefaultPath(t *testing.T) {
	t.Setenv("PHOTOVIEW_UI_PATH", "")
	assert.Equal(t, "./ui", utils.UIPath())
}

// =============================================================================
// GetValue and GetName Tests
// =============================================================================

func TestGetNameReturnsCorrectName(t *testing.T) {
	assert.Equal(t, "PHOTOVIEW_ACCESS_LOG_PATH", utils.EnvAccessLogPath.GetName())
	assert.Equal(t, "PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", utils.EnvAccessLogMaxSize.GetName())
}

func TestGetValueReturnsValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_PATH", "/test/path")
	assert.Equal(t, "/test/path", utils.EnvAccessLogPath.GetValue())
}

func TestGetValueReturnsEmptyWhenUnset(t *testing.T) {
	assert.Empty(t, utils.EnvAccessLogPath.GetValue())
}
