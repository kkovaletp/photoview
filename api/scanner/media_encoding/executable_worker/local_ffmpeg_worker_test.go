package executable_worker_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/kkovaletp/photoview/api/scanner/media_encoding/executable_worker"
	"github.com/kkovaletp/photoview/api/utils"
	"github.com/stretchr/testify/assert"
)

func TestLocalFfmpegWorker(t *testing.T) {
	tempDir := createTempDir(t)
	setup(t)
	defer teardown(tempDir)

	os.Setenv(string(utils.EnvDisableRawProcessing), "true")
	os.Setenv(string(utils.EnvDisableVideoEncoding), "false")
	executable_worker.InitializeExecutableWorkers()
	worker := executable_worker.FfmpegCli
	assert.True(t, worker.IsInstalled(), "FFmpeg worker should be configured")
	assert.Contains(t, worker.Path(), "ffmpeg", "Path to the FFmpeg's executable should contain 'ffmpeg'")

	testFile := filepath.Join(getWorkingDir(t), "test_data/Free_Test_Data_1.21MB_MKV.mkv")
	assert.FileExists(t, testFile, "Test data source video should be available")
	outputPath := filepath.Join(tempDir, "local_output.mp4")
	err := worker.EncodeMp4(testFile, outputPath)
	assert.NoError(t, err, "No error expected from video encoding")
	assert.FileExists(t, outputPath, "Encoded video output file should exist")

	outputThumbPath := filepath.Join(tempDir, "local_thumbnail.jpg")
	err = worker.EncodeVideoThumbnail(testFile, outputThumbPath, stubProbeData())
	assert.NoError(t, err, "No error expected from thumbnail extraction")
	assert.FileExists(t, outputThumbPath, "Video thumbnail output file should exist")
}
