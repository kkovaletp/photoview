package executable_worker

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/kkovaletp/photoview/api/utils"
	"github.com/pkg/errors"
)

func configureExternalFfmpegWorker() (*FfmpegWorker, error) {
	baseURL := os.Getenv(string(utils.EnvExtFFmpegBaseURL))
	portStr := os.Getenv(string(utils.EnvExtFFmpegPort))
	user := os.Getenv(string(utils.EnvExtFFmpegUser))
	pass := os.Getenv(string(utils.EnvExtFFmpegPass))
	timeoutStr := os.Getenv(string(utils.EnvExtFFmpegTimeout))
	videoCmdTemplate := strings.ReplaceAll(os.Getenv(string(utils.EnvExtFFmpegVideoCmd)), "\n", " ")
	thumbCmdTemplate := strings.ReplaceAll(os.Getenv(string(utils.EnvExtFFmpegThumbnailCmd)), "\n", " ")

	// Validate inputs
	if err := ValidateBaseURL(baseURL); err != nil {
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

	if err := ValidateCommandTemplate(videoCmdTemplate); err != nil {
		return nil, err
	}

	if err := ValidateCommandTemplate(thumbCmdTemplate); err != nil {
		return nil, err
	}

	// Check external FFmpeg worker availability and parse version
	healthURL := fmt.Sprintf("%s:%d/health", baseURL, port)
	resp, err := http.Get(healthURL)
	if err != nil || resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("external ffmpeg worker is not available: %s", err)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read health response body: %s", err)
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

func ValidateBaseURL(baseURL string) error {
	re := regexp.MustCompile(`^https?://[a-zA-Z0-9.-]+$`)
	if !re.MatchString(baseURL) {
		return fmt.Errorf("invalid BaseURL format: %s. Something like 'http(s)://host-name.or.fqdn' expected", baseURL)
	}
	return nil
}

func ValidateCommandTemplate(template string) error {
	if strings.ContainsAny(template, "[;&`$]") {
		return fmt.Errorf("invalid characters in command template: %s. Next characters forbidden: '[;&`$]'", template)
	}
	return nil
}

func (worker *FfmpegWorker) encodeWithExternalWorker(command string) error {
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

	body, err := io.ReadAll(resp.Body)
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

	//Is there a DEBUG logging mode in the project? Uncomment only for DEBUG logging
	//log.Printf("External ffmpeg worker STDOUT: %s", result["stdout"])
	//log.Printf("External ffmpeg worker STDERR: %s", result["stderr"])

	return nil
}
