package migrations_test

import (
	"os"
	"testing"

	"github.com/kkovaletp/photoview/api/test_utils"
)

func TestMain(m *testing.M) {
	os.Exit(test_utils.IntegrationTestRun(m))
}
