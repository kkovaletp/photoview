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

func setup(t *testing.T) {
	test_utils.FilesystemTest(t)
}

func teardown() {
	os.Unsetenv(string(utils.EnvDisableRawProcessing))
	os.Unsetenv(string(utils.EnvDisableVideoEncoding))
}

func boolToString(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

func TestInitializeExecutableWorkers(t *testing.T) {
	setup(t)
	defer teardown()

	testCases := []struct {
		name                 string
		disableRawProcessing bool
		disableVideoEncoding bool
	}{
		{
			name:                 "Both Enabled",
			disableRawProcessing: false,
			disableVideoEncoding: false,
		},
		{
			name:                 "Raw Processing Disabled",
			disableRawProcessing: true,
			disableVideoEncoding: false,
		},
		{
			name:                 "Video Encoding Disabled",
			disableRawProcessing: false,
			disableVideoEncoding: true,
		},
		{
			name:                 "Both Disabled",
			disableRawProcessing: true,
			disableVideoEncoding: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			os.Setenv(string(utils.EnvDisableRawProcessing), boolToString(tc.disableRawProcessing))
			os.Setenv(string(utils.EnvDisableVideoEncoding), boolToString(tc.disableVideoEncoding))

			executable_worker.InitializeExecutableWorkers()

			if tc.disableRawProcessing {
				assert.Nil(t, executable_worker.DarktableCli, "Expected DarktableCli to be nil")
			} else {
				assert.NotNil(t, executable_worker.DarktableCli, "Expected DarktableCli to be initialized")
			}

			if tc.disableVideoEncoding {
				assert.Nil(t, executable_worker.FfmpegCli, "Expected FfmpegCli to be nil")
			} else {
				assert.NotNil(t, executable_worker.FfmpegCli, "Expected FfmpegCli to be initialized")
			}
		})
	}
}
