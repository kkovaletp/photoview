package executable_worker

import (
	"fmt"
	"log"

	"github.com/kkovaletp/photoview/api/utils"
	"gopkg.in/vansante/go-ffprobe.v2"
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

func NewFfmpegWorker() (*FfmpegWorker, error) {
	if utils.EnvDisableVideoEncoding.GetBool() {
		return nil, fmt.Errorf("executable worker disabled (%s=1): ffmpeg", utils.EnvDisableVideoEncoding.GetName())
	}

	worker, err := configureExternalFfmpegWorker()
	if err == nil {
		return worker, nil
	}

	log.Printf("Falling back to local ffmpeg worker due to: %s\n", err)
	return configureLocalFfmpegWorker()
}
