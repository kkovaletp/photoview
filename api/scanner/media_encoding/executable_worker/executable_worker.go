package executable_worker

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/kkovaletp/photoview/api/utils"
	"github.com/pkg/errors"
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

type DarktableWorker struct {
	path string
}

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

func newDarktableWorker() *DarktableWorker {
	if utils.EnvDisableRawProcessing.GetBool() {
		log.Printf("Executable worker disabled (%s=1): darktable\n", utils.EnvDisableRawProcessing.GetName())
		return nil
	}

	path, err := exec.LookPath("darktable-cli")
	if err != nil {
		log.Println("Executable worker not found: darktable")
	} else {
		version, err := exec.Command(path, "--version").Output()
		if err != nil {
			log.Printf("Error getting version of darktable: %s\n", err)
			return nil
		}

		log.Printf("Found executable worker: darktable (%s)\n", strings.Split(string(version), "\n")[0])

		return &DarktableWorker{
			path: path,
		}
	}

	return nil
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

func configureExternalFfmpegWorker() (*FfmpegWorker, error) {
	baseURL := os.Getenv(string(utils.EnvExtFFmpegBaseURL))
	portStr := os.Getenv(string(utils.EnvExtFFmpegPort))
	user := os.Getenv(string(utils.EnvExtFFmpegUser))
	pass := os.Getenv(string(utils.EnvExtFFmpegPass))
	timeoutStr := os.Getenv(string(utils.EnvExtFFmpegTimeout))
	videoCmdTemplate := strings.ReplaceAll(os.Getenv(string(utils.EnvExtFFmpegVideoCmd)), "\n", " ")
	thumbCmdTemplate := strings.ReplaceAll(os.Getenv(string(utils.EnvExtFFmpegThumbnailCmd)), "\n", " ")

	// Validate inputs
	if err := validateBaseURL(baseURL); err != nil {
		return nil, err
	}

	port, err := strconv.Atoi(portStr)
	if err != nil || port <= 0 {
		return nil, fmt.Errorf("invalid port value: %s", portStr)
	}

	timeout, err := strconv.Atoi(timeoutStr)
	if err != nil || timeout <= 0 {
		return nil, fmt.Errorf("invalid timeout value: %s", timeoutStr)
	}

	if err := validateCommandTemplate(videoCmdTemplate); err != nil {
		return nil, err
	}

	if err := validateCommandTemplate(thumbCmdTemplate); err != nil {
		return nil, err
	}

	// Check external FFmpeg worker availability and parse version
	healthURL := fmt.Sprintf("%s:%d/health", baseURL, port)
	resp, err := http.Get(healthURL)
	if err != nil || resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("External ffmpeg worker is not available: %s", err)
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("Failed to read health response body: %s", err)
	}
	defer resp.Body.Close()

	log.Printf("Configured external ffmpeg worker at %s:%d (%s)\n",
		baseURL, port, strings.Split(string(body), "\n")[0])
	return &FfmpegWorker{
		external:         true,
		baseURL:          baseURL,
		port:             portStr,
		user:             user,
		pass:             pass,
		timeout:          timeout,
		videoCmdTemplate: videoCmdTemplate,
		thumbCmdTemplate: thumbCmdTemplate,
	}, nil
}

func configureLocalFfmpegWorker() *FfmpegWorker {
	path, err := exec.LookPath("ffmpeg")
	if err != nil {
		log.Println("Executable worker not found: ffmpeg")
	} else {
		version, err := exec.Command(path, "-version").Output()
		if err != nil {
			log.Printf("Error getting version of ffmpeg: %s\n", err)
			return nil
		}

		log.Printf("Found executable worker: ffmpeg (%s)\n", strings.Split(string(version), "\n")[0])

		return &FfmpegWorker{
			path:     path,
			external: false,
		}
	}

	return nil
}

func validateBaseURL(baseURL string) error {
	re := regexp.MustCompile(`^https?://[a-zA-Z0-9.-]+$`)
	if !re.MatchString(baseURL) {
		return fmt.Errorf("Invalid BaseURL format: %s. Something like 'http(s)://host-name.or.fqdn' expected", baseURL)
	}
	return nil
}

func validateCommandTemplate(template string) error {
	if strings.ContainsAny(template, "[;&|`$]") {
		return fmt.Errorf("Invalid characters in command template: %s. Next characters forbidden: '[;&|`$]'", template)
	}
	return nil
}

func (worker *DarktableWorker) IsInstalled() bool {
	return worker != nil
}

func (worker *FfmpegWorker) IsInstalled() bool {
	return worker != nil
}

func (worker *FfmpegWorker) Path() string {
	return worker.path
}

func (worker *DarktableWorker) EncodeJpeg(inputPath string, outputPath string, jpegQuality int) error {
	tmpDir, err := ioutil.TempDir("/tmp", "photoview-darktable")
	if err != nil {
		log.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	args := []string{
		inputPath,
		outputPath,
		"--core",
		"--conf",
		fmt.Sprintf("plugins/imageio/format/jpeg/quality=%d", jpegQuality),
		"--configdir",
		tmpDir,
	}

	cmd := exec.Command(worker.path, args...)

	if err := cmd.Run(); err != nil {
		return errors.Wrapf(err, "encoding image using: %s %v", worker.path, args)
	}

	return nil
}

func (worker *FfmpegWorker) EncodeMp4(inputPath string, outputPath string) error {
	if worker.external {
		command := strings.ReplaceAll(worker.videoCmdTemplate, "<inputPath>", inputPath)
		command = strings.ReplaceAll(command, "<outputPath>", outputPath)
		return worker.encodeWithExternalWorker(inputPath, outputPath, command)
	}
	return worker.encodeWithLocalFFmpeg(inputPath, outputPath)
}

func (worker *FfmpegWorker) EncodeVideoThumbnail(inputPath string, outputPath string, probeData *ffprobe.ProbeData) error {
	if worker.external {
		thumbnailOffsetSeconds := fmt.Sprintf("%d", int(probeData.Format.DurationSeconds*0.25))
		command := strings.ReplaceAll(worker.thumbCmdTemplate, "<thumbnailOffsetSeconds>", thumbnailOffsetSeconds)
		command = strings.ReplaceAll(command, "<inputPath>", inputPath)
		command = strings.ReplaceAll(command, "<outputPath>", outputPath)
		return worker.encodeWithExternalWorker(inputPath, outputPath, command)
	}
	return worker.encodeThumbnailWithLocalFFmpeg(inputPath, outputPath, probeData)
}

func (worker *FfmpegWorker) encodeWithExternalWorker(inputPath string, outputPath string, command string) error {
	requestBody, err := json.Marshal(map[string]string{
		"command": command,
	})
	if err != nil {
		log.Printf("Failed to serialize command to JSON: %s\n", err)
		return errors.Wrap(err, "Failed to serialize command to JSON")
	}

	url := fmt.Sprintf("%s:%s/execute", worker.baseURL, worker.port)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(requestBody))
	if err != nil {
		log.Printf("Failed to create new request: %s\n", err)
		return errors.Wrap(err, "Failed to create new request")
	}
	req.SetBasicAuth(worker.user, worker.pass)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: time.Duration(worker.timeout) * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Failed to execute request to external ffmpeg worker: %s\n", err)
		return errors.Wrap(err, "Failed to execute request to external ffmpeg worker")
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Failed to read response body: %s\n", err)
		return errors.Wrap(err, "Failed to read response body")
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("External ffmpeg worker failed: %s\n", body)
		return errors.Errorf("External ffmpeg worker failed: %s", body)
	}

	var result map[string]string
	if err := json.Unmarshal(body, &result); err != nil {
		log.Printf("Failed to deserialize response body: %s\n", err)
		return errors.Wrap(err, "Failed to deserialize response body")
	}

	log.Printf("External ffmpeg worker stdout: %s", result["stdout"])
	log.Printf("External ffmpeg worker stderr: %s", result["stderr"])

	return nil
}

func (worker *FfmpegWorker) encodeWithLocalFFmpeg(inputPath string, outputPath string) error {
	args := []string{
		"-i",
		inputPath,
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

func (worker *FfmpegWorker) encodeThumbnailWithLocalFFmpeg(inputPath string, outputPath string, probeData *ffprobe.ProbeData) error {
	thumbnailOffsetSeconds := fmt.Sprintf("%d", int(probeData.Format.DurationSeconds*0.25))

	args := []string{
		"-ss", thumbnailOffsetSeconds, // grab frame at time offset
		"-i",
		inputPath,
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
