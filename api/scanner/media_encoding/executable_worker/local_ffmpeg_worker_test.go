package executable_worker_test

import (
	"testing"

	"github.com/kkovaletp/photoview/api/scanner/media_encoding/executable_worker"
	"github.com/stretchr/testify/assert"
	"gopkg.in/vansante/go-ffprobe.v2"
)

func TestLocalFfmpegWorker(t *testing.T) {
	testFile := "./test_data/Free_Test_Data_1.21MB_MKV.mkv"

	worker := executable_worker.FfmpegCli
	assert.True(t, worker.IsInstalled())
	assert.Contains(t, worker.Path(), "ffmpeg")

	assert.FileExists(t, testFile)
	err := worker.EncodeMp4(testFile, "./test_data/local_output.mp4")
	assert.NoError(t, err)
	assert.FileExists(t, "./test_data/local_output.mp4")

	probeData := &ffprobe.ProbeData{
		Format: &ffprobe.Format{
			DurationSeconds: 8.0,
		},
	}
	err = worker.EncodeVideoThumbnail(testFile, "./test_data/local_thumbnail.jpg", probeData)
	assert.NoError(t, err)
	assert.FileExists(t, "./test_data/local_thumbnail.jpg")
}
