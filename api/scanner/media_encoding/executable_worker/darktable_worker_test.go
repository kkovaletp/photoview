package executable_worker_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/kkovaletp/photoview/api/scanner/media_encoding/executable_worker"
	"github.com/kkovaletp/photoview/api/utils"
	"github.com/stretchr/testify/assert"
)

func TestDarktableWorker(t *testing.T) {
	tempDir := createTempDir(t)
	setup(t)
	defer teardown(tempDir)

	os.Setenv(string(utils.EnvDisableRawProcessing), "false")
	os.Setenv(string(utils.EnvDisableVideoEncoding), "true")
	executable_worker.InitializeExecutableWorkers()
	worker := executable_worker.DarktableCli
	assert.True(t, worker.IsInstalled(), "Darktable expected to be initialized")
	assert.Contains(t, worker.Path(),
		"darktable-cli", "Darktable executable path should contain 'darktable-cli': %s", worker.Path())

	testFile := filepath.Join(getWorkingDir(t), "test_data/bird.jpg")
	assert.FileExists(t, testFile, "Test data source image should exist")
	outputPath := filepath.Join(tempDir, "bird_output.jpg")
	err := worker.EncodeJpeg(testFile, outputPath, 90)
	assert.NoError(t, err, "No error expected from image encoding")
	assert.FileExists(t, outputPath, "Output file should exist")
}
