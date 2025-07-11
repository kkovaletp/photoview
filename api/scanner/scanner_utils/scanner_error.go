package scanner_utils

import (
	"context"
	"fmt"

	"github.com/kkovaletp/photoview/api/graphql/models"
	"github.com/kkovaletp/photoview/api/graphql/notification"
	"github.com/kkovaletp/photoview/api/log"
	"github.com/kkovaletp/photoview/api/utils"
)

func ScannerError(ctx context.Context, format string, args ...any) {
	message := fmt.Sprintf(format, args...)

	log.Error(ctx, message)
	notification.BroadcastNotification(&models.Notification{
		Key:      utils.GenerateToken(),
		Type:     models.NotificationTypeMessage,
		Header:   "Scanner error",
		Content:  message,
		Negative: true,
	})
}
