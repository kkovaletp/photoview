package executable_worker

import (
	"log"

	"github.com/kkovaletp/photoview/api/utils"
	"gopkg.in/vansante/go-ffprobe.v2"
)

func InitializeExecutableWorkers() {
	DarktableCli = newDarktableWorker()
	FfmpegCli = newFfmpegWorker()
}

var DarktableCli *DarktableWorker = nil
var FfmpegCli *FfmpegWorker = nil

type ExecutableWorker interface {
	Path() string
	IsInstalled() bool
	EncodeMp4(inputPath string, outputPath string) error
	EncodeVideoThumbnail(inputPath string, outputPath string, probeData *ffprobe.ProbeData) error
}

func newDarktableWorker() *DarktableWorker {
	if utils.EnvDisableRawProcessing.GetBool() {
		log.Printf("Executable worker disabled (%s=1): darktable\n", utils.EnvDisableRawProcessing.GetName())
		return nil
	}
	return configureDarktableWorker()
}

func newFfmpegWorker() *FfmpegWorker {
	if utils.EnvDisableVideoEncoding.GetBool() {
		log.Printf("Executable worker disabled (%s=1): ffmpeg\n", utils.EnvDisableVideoEncoding.GetName())
		return nil
	}

	worker, err := configureExternalFfmpegWorker()
	if err == nil {
		return worker
	}

	log.Printf("Falling back to local ffmpeg worker due to: %s\n", err)
	return configureLocalFfmpegWorker()
}
