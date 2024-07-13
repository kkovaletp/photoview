package executable_worker_test

import (
	"os"
	"testing"

	"github.com/kkovaletp/photoview/api/scanner/media_encoding/executable_worker"
	"github.com/kkovaletp/photoview/api/utils"
	"github.com/stretchr/testify/assert"
	"gopkg.in/vansante/go-ffprobe.v2"
)

func setupExternalFfmpegWorker() *executable_worker.FfmpegWorker {
	os.Setenv(string(utils.EnvExtFFmpegBaseURL), "http://localhost")
	os.Setenv(string(utils.EnvExtFFmpegPort), "5000")
	os.Setenv(string(utils.EnvExtFFmpegUser), "ffmpeg")
	os.Setenv(string(utils.EnvExtFFmpegPass), "ffmpeg-pass")
	os.Setenv(string(utils.EnvExtFFmpegTimeout), "300")
	os.Setenv(string(utils.EnvExtFFmpegVideoCmd), "-i <inputPath> -vcodec h264 -acodec aac -vf scale='min(1080,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2 -movflags +faststart+use_metadata_tags <outputPath>")
	os.Setenv(string(utils.EnvExtFFmpegThumbnailCmd), "-ss <thumbnailOffsetSeconds> -i <inputPath> -vframes 1 -an -vf scale='min(1024,iw)':'min(1024,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2 <outputPath>")

	worker, err := executable_worker.NewFfmpegWorker()
	if err != nil {
		panic(err)
	}
	return worker
}

func TestExternalFfmpegWorker(t *testing.T) {
	testFile := "./test_data/Free_Test_Data_1.21MB_MKV.mkv"

	worker := setupExternalFfmpegWorker()
	assert.True(t, worker.IsInstalled())
	assert.Nil(t, worker.Path())

	assert.FileExists(t, testFile)
	err := worker.EncodeMp4(testFile, "./test_data/external_output.mp4")
	assert.NoError(t, err)
	assert.FileExists(t, "./test_data/external_output.mp4")

	probeData := &ffprobe.ProbeData{
		Format: &ffprobe.Format{
			DurationSeconds: 8.0,
		},
	}
	err = worker.EncodeVideoThumbnail(testFile, "./test_data/external_thumbnail.jpg", probeData)
	assert.NoError(t, err)
	assert.FileExists(t, "./test_data/external_thumbnail.jpg")
}

func TestValidateBaseURL(t *testing.T) {
	validURLs := []string{
		"http://localhost",
		"https://example.com",
		"http://example.com",
		"https://sub-domain.example.com",
	}
	for _, url := range validURLs {
		assert.NoError(t, executable_worker.ValidateBaseURL(url))
	}

	invalidURLs := []string{
		"ftp://example.com",
		"example.com",
		"http://",
		"//example.com",
		"https://example.com/path",
		"http://example.com:5000",
	}
	for _, url := range invalidURLs {
		assert.Error(t, executable_worker.ValidateBaseURL(url))
	}
}

func TestValidateCommandTemplate(t *testing.T) {
	validTemplates := []string{
		"-i <inputPath> -vcodec h264 -acodec aac -vf scale='min(1080,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2 -movflags +faststart+use_metadata_tags <outputPath>",
		"-ss <thumbnailOffsetSeconds> -i <inputPath> -vframes 1 -an -vf scale='min(1024,iw)':'min(1024,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2 <outputPath>",
	}
	for _, template := range validTemplates {
		assert.NoError(t, executable_worker.ValidateCommandTemplate(template))
	}

	invalidTemplates := []string{
		"-i <inputPath> -vcodec h264; rm -rf /",
		"-i <inputPath> -vcodec h264 | ls",
	}
	for _, template := range invalidTemplates {
		assert.Error(t, executable_worker.ValidateCommandTemplate(template))
	}
}
