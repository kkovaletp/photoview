package executable_worker

import (
	"fmt"
	"log"
	"os/exec"
	"strings"

	"github.com/pkg/errors"
	"gopkg.in/vansante/go-ffprobe.v2"
)

func configureLocalFfmpegWorker() (*FfmpegWorker, error) {
	path, err := exec.LookPath("ffmpeg")
	if err != nil {
		return nil, fmt.Errorf("executable worker not found: ffmpeg \n%s", err)
	}

	version, err := exec.Command(path, "-version").Output()
	if err != nil {
		return nil, fmt.Errorf("error getting version of ffmpeg: \n%s", err)
	}

	log.Printf("Found executable worker: ffmpeg (%s)\n", strings.Split(string(version), "\n")[0])

	return &FfmpegWorker{
		path:     path,
		external: false,
	}, nil
}

func (worker *FfmpegWorker) encodeWithLocalFFmpeg(inputPath string, outputPath string) error {
	args := []string{
		"-i", inputPath,
		"-vcodec", "h264",
		"-acodec", "aac",
		"-vf", "scale='min(1080,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
		"-movflags", "+faststart+use_metadata_tags",
		outputPath,
	}

	cmd := exec.Command(worker.path, args...)

	if err := cmd.Run(); err != nil {
		return errors.Wrapf(err, "Encoding video using: %s", worker.path)
	}

	return nil
}

func (worker *FfmpegWorker) encodeThumbnailWithLocalFFmpeg(inputPath string, outputPath string,
	probeData *ffprobe.ProbeData) error {
	thumbnailOffsetSeconds := fmt.Sprintf("%d", int(probeData.Format.DurationSeconds*0.25))

	args := []string{
		"-ss", thumbnailOffsetSeconds, // grab frame at time offset
		"-i", inputPath,
		"-vframes", "1", // output one frame
		"-an", // disable audio
		"-vf", "scale='min(1024,iw)':'min(1024,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
		outputPath,
	}

	cmd := exec.Command(worker.path, args...)

	if err := cmd.Run(); err != nil {
		return errors.Wrapf(err, "encoding video using: %s", worker.path)
	}

	return nil
}
