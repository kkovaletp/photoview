package cleanup_tasks

import (
	"github.com/kkovaletp/photoview/api/graphql/models"
	"github.com/kkovaletp/photoview/api/scanner/scanner_task"
	"github.com/kkovaletp/photoview/api/scanner/scanner_utils"
)

type MediaCleanupTask struct {
	scanner_task.ScannerTaskBase
}

func (t MediaCleanupTask) AfterScanAlbum(ctx scanner_task.TaskContext, changedMedia []*models.Media, albumMedia []*models.Media) error {

	cleanup_errors := CleanupMedia(ctx.GetDB(), ctx.GetAlbum().ID, albumMedia)
	for _, err := range cleanup_errors {
		scanner_utils.ScannerError("delete old media: %s", err)
	}

	return nil
}
