package executable_worker_test

import (
	"testing"

	"github.com/kkovaletp/photoview/api/scanner/media_encoding/executable_worker"
	"github.com/stretchr/testify/assert"
)

func TestDarktableWorker(t *testing.T) {
	worker := executable_worker.DarktableCli
	assert.True(t, worker.IsInstalled())
	assert.Contains(t, worker.Path(), "darktable-cli")

	assert.FileExists(t, "./test_data/bird.jpg")
	err := worker.EncodeJpeg("./test_data/bird.jpg", "./test_data/bird_output.jpg", 90)
	assert.NoError(t, err)
	assert.FileExists(t, "./test_data/bird_output.jpg")
}
