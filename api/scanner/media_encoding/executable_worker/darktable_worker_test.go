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
	setup(t)
	defer teardown()

	os.Setenv(string(utils.EnvDisableRawProcessing), "false")
	os.Setenv(string(utils.EnvDisableVideoEncoding), "true")
	executable_worker.InitializeExecutableWorkers()
	worker := executable_worker.DarktableCli
	assert.True(t, worker.IsInstalled(), "Darktable expected to be installed")
	assert.Contains(t, worker.Path(), "darktable-cli", "Darktable executable path should contain 'darktable-cli': %s", worker.Path())

	assert.FileExists(t, "./test_data/bird.jpg")
	tempDir := t.TempDir()
	outputPath := filepath.Join(tempDir, "bird_output.jpg")
	err := worker.EncodeJpeg("./test_data/bird.jpg", outputPath, 90)
	assert.NoError(t, err)
	assert.FileExists(t, outputPath)
}
