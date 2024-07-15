package executable_worker

import (
	"log"

	"github.com/kkovaletp/photoview/api/utils"
)

func InitializeExecutableWorkers() {
	var err error
	DarktableCli = newDarktableWorker()
	FfmpegCli, err = NewFfmpegWorker()
	if err != nil {
		log.Printf("An error occured when trying to initialize FFmpeg worker:\n%s", err)
	}
}

var DarktableCli *DarktableWorker = nil
var FfmpegCli *FfmpegWorker = nil

func newDarktableWorker() *DarktableWorker {
	if utils.EnvDisableRawProcessing.GetBool() {
		log.Printf("Executable worker disabled (%s=1): darktable\n", utils.EnvDisableRawProcessing.GetName())
		return nil
	}
	return configureDarktableWorker()
}

func NewFfmpegWorker() (*FfmpegWorker, error) {
	if utils.EnvDisableVideoEncoding.GetBool() {
		log.Printf("Executable worker disabled (%s=1): ffmpeg", utils.EnvDisableVideoEncoding.GetName())
		return nil, nil
	}

	worker, err := configureExternalFfmpegWorker()
	if err == nil {
		return worker, nil
	}

	log.Printf("Falling back to local ffmpeg worker due to: %s\n", err)
	return configureLocalFfmpegWorker()
}
