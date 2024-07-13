package executable_worker_test

import (
	"os"
	"testing"

	"github.com/kkovaletp/photoview/api/scanner/media_encoding/executable_worker"
	"github.com/kkovaletp/photoview/api/test_utils"
	"github.com/kkovaletp/photoview/api/utils"
	"github.com/stretchr/testify/assert"
)

func TestMain(m *testing.M) {
	os.Exit(test_utils.IntegrationTestRun(m))
}

func TestInitializeExecutableWorkers(t *testing.T) {
	test_utils.FilesystemTest(t)
	executable_worker.InitializeExecutableWorkers()

	if utils.EnvDisableRawProcessing.GetBool() {
		assert.Nil(t, executable_worker.DarktableCli)
	} else {
		assert.NotNil(t, executable_worker.DarktableCli)
	}

	if utils.EnvDisableVideoEncoding.GetBool() {
		assert.Nil(t, executable_worker.FfmpegCli)
	} else {
		assert.NotNil(t, executable_worker.FfmpegCli)
	}
}
