package executable_worker

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"strings"

	"github.com/pkg/errors"
)

type DarktableWorker struct {
	path string
}

func (worker *DarktableWorker) IsInstalled() bool {
	return worker != nil
}

func (worker *DarktableWorker) Path() string {
	return worker.path
}

func configureDarktableWorker() *DarktableWorker {
	path, err := exec.LookPath("darktable-cli")
	if err != nil {
		log.Println("Executable worker not found: darktable")
		return nil
	}

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

func (worker *DarktableWorker) EncodeJpeg(inputPath string, outputPath string, jpegQuality int) error {
	tmpDir, err := os.MkdirTemp("/tmp", "photoview-darktable")
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
