package utils_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/kkovaletp/photoview/api/utils"
	"github.com/stretchr/testify/assert"
)

// =============================================================================
// GetInt Tests - CRITICAL: Error handling and parsing
// =============================================================================

func TestGetInt_ValidInteger(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", "25")
	result := utils.EnvAccessLogMaxSize.GetInt()
	assert.Equal(t, 25, result)
}

func TestGetInt_EmptyString(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", "")
	result := utils.EnvAccessLogMaxSize.GetInt()
	assert.Equal(t, 0, result)
}

func TestGetInt_InvalidInteger(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", "not-a-number")
	result := utils.EnvAccessLogMaxSize.GetInt()
	// Should return 0 on error and log error message
	assert.Equal(t, 0, result)
}

func TestGetInt_NegativeInteger(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_FILES", "-1")
	result := utils.EnvAccessLogMaxFiles.GetInt()
	assert.Equal(t, -1, result)
}

func TestGetInt_Zero(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_DAYS", "0")
	result := utils.EnvAccessLogMaxDays.GetInt()
	assert.Equal(t, 0, result)
}

func TestGetInt_Unset(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", "")
	os.Unsetenv("PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB")
	result := utils.EnvAccessLogMaxSize.GetInt()
	assert.Equal(t, 0, result)
}

// =============================================================================
// AccessLogPath Tests - CRITICAL: Path resolution and error handling
// =============================================================================

func TestAccessLogPath_WithValidPath(t *testing.T) {
	tempDir := t.TempDir()
	t.Setenv("PHOTOVIEW_ACCESS_LOG_PATH", tempDir)

	path, err := utils.AccessLogPath()
	assert.NoError(t, err)
	assert.NotEmpty(t, path)
	assert.Contains(t, path, "access.log")
	// Should be absolute path
	assert.True(t, filepath.IsAbs(path))
}

func TestAccessLogPath_WithRelativePath(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_PATH", "./logs")

	path, err := utils.AccessLogPath()
	assert.NoError(t, err)
	assert.NotEmpty(t, path)
	assert.Contains(t, path, "access.log")
	// Should be converted to absolute
	assert.True(t, filepath.IsAbs(path))
}

func TestAccessLogPath_EmptyWhenUnset(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_PATH", "")

	path, err := utils.AccessLogPath()
	assert.NoError(t, err)
	assert.Empty(t, path, "Should return empty string when env var is not set")
}

func TestAccessLogPath_CleansPath(t *testing.T) {
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

func TestAccessLogMaxSize_DefaultValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", "")
	result := utils.AccessLogMaxSize()
	assert.Equal(t, 10, result, "Should return default 10MB")
}

func TestAccessLogMaxSize_CustomValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", "50")
	result := utils.AccessLogMaxSize()
	assert.Equal(t, 50, result)
}

func TestAccessLogMaxSize_ZeroValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", "0")
	result := utils.AccessLogMaxSize()
	assert.Equal(t, 10, result, "Should return default when set to 0")
}

func TestAccessLogMaxSize_NegativeValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", "-5")
	result := utils.AccessLogMaxSize()
	assert.Equal(t, 10, result, "Should return default for negative values")
}

// =============================================================================
// AccessLogMaxFiles Tests - CRITICAL: Special handling for negative values
// =============================================================================

func TestAccessLogMaxFiles_DefaultValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_FILES", "")
	result := utils.AccessLogMaxFiles()
	assert.Equal(t, 5, result, "Should return default 5 files")
}

func TestAccessLogMaxFiles_CustomPositiveValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_FILES", "10")
	result := utils.AccessLogMaxFiles()
	assert.Equal(t, 10, result)
}

func TestAccessLogMaxFiles_ZeroValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_FILES", "0")
	result := utils.AccessLogMaxFiles()
	assert.Equal(t, 5, result, "Should return default 5 when set to 0")
}

func TestAccessLogMaxFiles_NegativeValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_FILES", "-1")
	result := utils.AccessLogMaxFiles()
	assert.Equal(t, 0, result, "Negative value means keep all files (return 0)")
}

func TestAccessLogMaxFiles_LargeNegativeValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_FILES", "-999")
	result := utils.AccessLogMaxFiles()
	assert.Equal(t, 0, result, "Any negative value means keep all files")
}

// =============================================================================
// AccessLogMaxDays Tests - Default behavior
// =============================================================================

func TestAccessLogMaxDays_DefaultValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_DAYS", "")
	result := utils.AccessLogMaxDays()
	assert.Equal(t, 0, result, "Should return 0 (never delete) by default")
}

func TestAccessLogMaxDays_CustomValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_DAYS", "30")
	result := utils.AccessLogMaxDays()
	assert.Equal(t, 30, result)
}

func TestAccessLogMaxDays_ZeroValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_DAYS", "0")
	result := utils.AccessLogMaxDays()
	assert.Equal(t, 0, result, "Zero means never delete old logs")
}

func TestAccessLogMaxDays_NegativeValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_MAX_DAYS", "-5")
	result := utils.AccessLogMaxDays()
	assert.Equal(t, 0, result, "Negative values should return default 0")
}

// =============================================================================
// GetBool Tests - Existing function coverage
// =============================================================================

func TestGetBool_TrueValues(t *testing.T) {
	testCases := []string{"1", "true", "True", "TRUE"}

	for _, value := range testCases {
		t.Run(value, func(t *testing.T) {
			t.Setenv("PHOTOVIEW_DEVELOPMENT_MODE", value)
			result := utils.EnvDevelopmentMode.GetBool()
			assert.True(t, result)
		})
	}
}

func TestGetBool_FalseValues(t *testing.T) {
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

func TestShouldServeUI_True(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "1")
	assert.True(t, utils.ShouldServeUI())
}

func TestShouldServeUI_False(t *testing.T) {
	t.Setenv("PHOTOVIEW_SERVE_UI", "")
	assert.False(t, utils.ShouldServeUI())
}

func TestDevelopmentMode_True(t *testing.T) {
	t.Setenv("PHOTOVIEW_DEVELOPMENT_MODE", "true")
	assert.True(t, utils.DevelopmentMode())
}

func TestDevelopmentMode_False(t *testing.T) {
	t.Setenv("PHOTOVIEW_DEVELOPMENT_MODE", "")
	assert.False(t, utils.DevelopmentMode())
}

func TestUIPath_CustomPath(t *testing.T) {
	t.Setenv("PHOTOVIEW_UI_PATH", "/custom/ui")
	assert.Equal(t, "/custom/ui", utils.UIPath())
}

func TestUIPath_DefaultPath(t *testing.T) {
	t.Setenv("PHOTOVIEW_UI_PATH", "")
	assert.Equal(t, "./ui", utils.UIPath())
}

// =============================================================================
// GetValue and GetName Tests
// =============================================================================

func TestGetName_ReturnsCorrectName(t *testing.T) {
	assert.Equal(t, "PHOTOVIEW_ACCESS_LOG_PATH", utils.EnvAccessLogPath.GetName())
	assert.Equal(t, "PHOTOVIEW_ACCESS_LOG_MAX_SIZE_MB", utils.EnvAccessLogMaxSize.GetName())
}

func TestGetValue_ReturnsValue(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_PATH", "/test/path")
	assert.Equal(t, "/test/path", utils.EnvAccessLogPath.GetValue())
}

func TestGetValue_ReturnsEmptyWhenUnset(t *testing.T) {
	t.Setenv("PHOTOVIEW_ACCESS_LOG_PATH", "")
	os.Unsetenv("PHOTOVIEW_ACCESS_LOG_PATH")
	assert.Empty(t, utils.EnvAccessLogPath.GetValue())
}
