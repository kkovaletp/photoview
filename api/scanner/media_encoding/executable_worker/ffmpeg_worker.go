package executable_worker

import (
	"fmt"
	"strings"

	"gopkg.in/vansante/go-ffprobe.v2"
)

type FfmpegWorker struct {
	path             string
	external         bool
	baseURL          string
	port             string
	user             string
	pass             string
	timeout          int
	videoCmdTemplate string
	thumbCmdTemplate string
}

func (worker *FfmpegWorker) IsInstalled() bool {
	return worker != nil
}

func (worker *FfmpegWorker) Path() string {
	return worker.path
}

func (worker *FfmpegWorker) EncodeMp4(inputPath string, outputPath string) error {
	if worker.external {
		command := strings.ReplaceAll(worker.videoCmdTemplate, "<inputPath>", inputPath)
		command = strings.ReplaceAll(command, "<outputPath>", outputPath)
		return worker.encodeWithExternalWorker(command)
	}
	return worker.encodeWithLocalFFmpeg(inputPath, outputPath)
}

func (worker *FfmpegWorker) EncodeVideoThumbnail(inputPath string, outputPath string, probeData *ffprobe.ProbeData) error {
	if worker.external {
		thumbnailOffsetSeconds := fmt.Sprintf("%d", int(probeData.Format.DurationSeconds*0.25))
		command := strings.ReplaceAll(worker.thumbCmdTemplate, "<thumbnailOffsetSeconds>", thumbnailOffsetSeconds)
		command = strings.ReplaceAll(command, "<inputPath>", inputPath)
		command = strings.ReplaceAll(command, "<outputPath>", outputPath)
		return worker.encodeWithExternalWorker(command)
	}
	return worker.encodeThumbnailWithLocalFFmpeg(inputPath, outputPath, probeData)
}
