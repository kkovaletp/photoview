package executable_worker_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/kkovaletp/photoview/api/scanner/media_encoding/executable_worker"
	"github.com/kkovaletp/photoview/api/utils"
	"github.com/stretchr/testify/assert"
)

func TestExternalFfmpegWorker(t *testing.T) {
	tempDir := createTempDir(t)
	setup(t)
	defer teardown(tempDir)

	os.Setenv(string(utils.EnvDisableRawProcessing), "true")
	os.Setenv(string(utils.EnvDisableVideoEncoding), "false")
	os.Setenv(string(utils.EnvExtFFmpegBaseURL), "http://localhost")
	os.Setenv(string(utils.EnvExtFFmpegPort), "5000")
	os.Setenv(string(utils.EnvExtFFmpegUser), "ffmpeg")
	os.Setenv(string(utils.EnvExtFFmpegPass), "ffmpeg-pass")
	os.Setenv(string(utils.EnvExtFFmpegTimeout), "300")
	os.Setenv(string(utils.EnvExtFFmpegVideoCmd),
		"-i <inputPath> -vcodec h264 -acodec aac -vf scale='min(1080,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2 -movflags +faststart+use_metadata_tags <outputPath>")
	os.Setenv(string(utils.EnvExtFFmpegThumbnailCmd),
		"-ss <thumbnailOffsetSeconds> -i <inputPath> -vframes 1 -an -vf scale='min(1024,iw)':'min(1024,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2 <outputPath>")

	executable_worker.InitializeExecutableWorkers()
	worker := executable_worker.FfmpegCli
	assert.True(t, worker.IsInstalled(), "FFmpeg worker should be configured")
	assert.EqualValuesf(t, "", worker.Path(), "path value for external worker expected to be empty")

	testFile := filepath.Join(getWorkingDir(t), "test_data/Free_Test_Data_1.21MB_MKV.mkv")
	assert.FileExists(t, testFile, "Test data source video should be available")
	outputPath := filepath.Join(tempDir, "external_output.mp4")

	err := worker.EncodeMp4(testFile, outputPath)
	assert.NoError(t, err, "No error expected from video encoding")
	assert.FileExists(t, outputPath, "Encoded video output file should exist")

	outputThumbPath := filepath.Join(tempDir, "external_thumbnail.jpg")
	err = worker.EncodeVideoThumbnail(testFile, outputThumbPath, stubProbeData())
	assert.NoError(t, err, "No error expected from thumbnail extraction")
	assert.FileExists(t, outputThumbPath, "Video thumbnail output file should exist")
}

func TestValidateBaseURL(t *testing.T) {
	validURLs := []string{
		"http://localhost",
		"https://example.com",
		"http://example.com",
		"https://sub-domain.example.com",
	}
	for _, url := range validURLs {
		assert.NoError(t, executable_worker.ValidateBaseURL(url), "No error expected for a valid URL validation")
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
		assert.Error(t, executable_worker.ValidateBaseURL(url), "Error expected for an invalid URL validation")
	}
}

func TestValidateCommandTemplate(t *testing.T) {
	validTemplates := []string{
		"-i <inputPath> -vcodec h264 -acodec aac -vf scale='min(1080,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2 -movflags +faststart+use_metadata_tags <outputPath>",
		"-ss <thumbnailOffsetSeconds> -i <inputPath> -vframes 1 -an -vf scale='min(1024,iw)':'min(1024,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2 <outputPath>",
		"-vaapi_device /dev/dri/renderD128 -i <inputPath> -vcodec h264_vaapi -acodec aac -vf format=nv12|vaapi,hwupload,scale_vaapi='min(1080,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2 -movflags +faststart+use_metadata_tags <outputPath>",
		"-vaapi_device /dev/dri/renderD128 -ss <thumbnailOffsetSeconds> -i <inputPath>	-vframes 1 -an -vf format=nv12|vaapi,hwupload,scale_vaapi='min(1024,iw)':'min(1024,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2 <outputPath>",
		"-hwaccel qsv -i <inputPath> -vcodec h264_qsv -acodec aac -vf scale='min(1080,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2 -movflags +faststart+use_metadata_tags <outputPath>",
		"-hwaccel qsv -ss <thumbnailOffsetSeconds> -i <inputPath> -vframes 1 -an -vf scale='min(1024,iw)':'min(1024,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2 <outputPath>",
		"-hwaccel nvdec -i	<inputPath> -vcodec h264_nvenc -acodec aac -vf scale='min(1080,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2 -movflags +faststart+use_metadata_tags	<outputPath>",
		"-hwaccel nvdec -ss <thumbnailOffsetSeconds> -i <inputPath>	-vframes 1 -an -vf scale='min(1024,iw)':'min(1024,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2 <outputPath>",
	}
	for _, template := range validTemplates {
		assert.NoError(t, executable_worker.ValidateCommandTemplate(template),
			"No error expected for a valid command template validation")
	}

	invalidTemplates := []string{
		"-i <inputPath> -vcodec h264; rm -rf /",
		"-i <inputPath> -vcodec h264 | ls",
		"-i <inputPath> -vcodec h264 [ls]",
		"-i <inputPath> -vcodec h264 && ls",
		"-i <inputPath> -vcodec h264 `ls`",
		"-i <inputPath> -vcodec h264 $(ls)",
	}
	for _, template := range invalidTemplates {
		assert.Error(t, executable_worker.ValidateCommandTemplate(template),
			"An error expected for a dangerous command template validation")
	}
}
