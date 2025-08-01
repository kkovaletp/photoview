package scanner

import (
	"bufio"
	"container/list"
	"log"
	"os"
	"path"

	"github.com/kkovaletp/photoview/api/graphql/models"
	"github.com/kkovaletp/photoview/api/scanner/scanner_cache"
	"github.com/kkovaletp/photoview/api/scanner/scanner_tasks/cleanup_tasks"
	"github.com/kkovaletp/photoview/api/scanner/scanner_utils"
	"github.com/kkovaletp/photoview/api/utils"
	"github.com/pkg/errors"
	ignore "github.com/sabhiram/go-gitignore"
	"gorm.io/gorm"
)

func getPhotoviewIgnore(ignorePath string) ([]string, error) {
	var photoviewIgnore []string

	// Open .photoviewignore file, if exists
	photoviewIgnoreFile, err := os.Open(path.Join(ignorePath, ".photoviewignore"))
	if err != nil {
		if os.IsNotExist(err) {
			return photoviewIgnore, nil
		}
		return photoviewIgnore, err
	}

	// Close file on exit
	defer photoviewIgnoreFile.Close()

	// Read and save .photoviewignore data
	scanner := bufio.NewScanner(photoviewIgnoreFile)
	for scanner.Scan() {
		photoviewIgnore = append(photoviewIgnore, scanner.Text())
		log.Printf("Ignore found: %s", scanner.Text())
	}

	return photoviewIgnore, scanner.Err()
}

func FindAlbumsForUser(db *gorm.DB, user *models.User, albumCache *scanner_cache.AlbumScannerCache) ([]*models.Album, []error) {

	if err := user.FillAlbums(db); err != nil {
		return nil, []error{err}
	}

	userAlbumIDs := make([]int, len(user.Albums))
	for i, album := range user.Albums {
		userAlbumIDs[i] = album.ID
	}

	var userRootAlbums []*models.Album
	if err := db.
		Where("id IN (?)", userAlbumIDs).
		Where("parent_album_id IS NULL OR parent_album_id NOT IN (?)", userAlbumIDs).
		Order("path ASC").
		Find(&userRootAlbums).Error; err != nil {
		return nil, []error{err}
	}

	scanErrors := make([]error, 0)

	type scanInfo struct {
		path   string
		parent *models.Album
		ignore []string
	}

	scanQueue := list.New()

	for _, album := range userRootAlbums {
		// Check if user album directory exists on the file system
		if _, err := os.Stat(album.Path); err != nil {
			if os.IsNotExist(err) {
				scanErrors = append(scanErrors, errors.Errorf("Album directory for user '%s' does not exist '%s'\n", user.Username, album.Path))
			} else {
				scanErrors = append(scanErrors, errors.Errorf("Could not read album directory for user '%s': %s\n", user.Username, album.Path))
			}
		} else {
			scanQueue.PushBack(scanInfo{
				path:   album.Path,
				parent: nil,
				ignore: nil,
			})
		}
	}

	userAlbums := make([]*models.Album, 0)

	for scanQueue.Front() != nil {
		albumInfo := scanQueue.Front().Value.(scanInfo)
		scanQueue.Remove(scanQueue.Front())

		albumPath := albumInfo.path
		albumParent := albumInfo.parent
		albumIgnore := albumInfo.ignore

		// Read path
		dirContent, err := os.ReadDir(albumPath)
		if err != nil {
			scanErrors = append(scanErrors, errors.Wrapf(err, "read directory (%s)", albumPath))
			continue
		}

		// Skip this dir if in ignore list
		ignorePaths := ignore.CompileIgnoreLines(albumIgnore...)
		if ignorePaths.MatchesPath(albumPath + "/") {
			log.Printf("Skip, directroy %s is in ignore file", albumPath)
			continue
		}

		// Update ignore dir list
		photoviewIgnore, err := getPhotoviewIgnore(albumPath)
		if err != nil {
			log.Printf("Failed to get ignore file, err = %s", err)
		} else {
			albumIgnore = append(albumIgnore, photoviewIgnore...)
		}

		// Will become new album or album from db
		var album *models.Album

		transErr := db.Transaction(func(tx *gorm.DB) error {
			log.Printf("Scanning directory: %s", albumPath)

			// check if album already exists
			var albumResult []models.Album
			result := tx.Where("path_hash = ?", models.MD5Hash(albumPath)).Find(&albumResult)
			if result.Error != nil {
				return result.Error
			}

			// album does not exist, create new
			if len(albumResult) == 0 {
				albumTitle := path.Base(albumPath)

				var albumParentID *int
				parentOwners := make([]models.User, 0)
				if albumParent != nil {
					albumParentID = &albumParent.ID

					if err := tx.Model(&albumParent).Association("Owners").Find(&parentOwners); err != nil {
						return err
					}
				}

				album = &models.Album{
					Title:         albumTitle,
					ParentAlbumID: albumParentID,
					Path:          albumPath,
				}

				// Store album ignore
				albumCache.InsertAlbumIgnore(albumPath, albumIgnore)

				if err := tx.Create(&album).Error; err != nil {
					return errors.Wrap(err, "insert album into database")
				}

				if err := tx.Model(&album).Association("Owners").Append(parentOwners); err != nil {
					return errors.Wrap(err, "add owners to album")
				}
			} else {
				album = &albumResult[0]

				// Add user as an owner of the album if not already
				var userAlbumOwner []models.User
				if err := tx.Model(&album).Association("Owners").Find(&userAlbumOwner, "user_albums.user_id = ?", user.ID); err != nil {
					return err
				}
				if len(userAlbumOwner) == 0 {
					newUser := models.User{}
					newUser.ID = user.ID
					if err := tx.Model(&album).Association("Owners").Append(&newUser); err != nil {
						return err
					}
				}

				// Update album ignore
				albumCache.InsertAlbumIgnore(albumPath, albumIgnore)
			}

			userAlbums = append(userAlbums, album)

			return nil
		})

		if transErr != nil {
			scanErrors = append(scanErrors, errors.Wrap(transErr, "begin database transaction"))
			continue
		}

		// Scan for sub-albums
		for _, item := range dirContent {
			subalbumPath := path.Join(albumPath, item.Name())

			// Skip if directory is hidden
			if path.Base(subalbumPath)[0:1] == "." {
				continue
			}

			isDirSymlink, err := utils.IsDirSymlink(subalbumPath)
			if err != nil {
				scanErrors = append(scanErrors, errors.Wrapf(err, "could not check for symlink target of %s", subalbumPath))
				continue
			}

			if (item.IsDir() || isDirSymlink) && directoryContainsPhotos(subalbumPath, albumCache, albumIgnore) {
				scanQueue.PushBack(scanInfo{
					path:   subalbumPath,
					parent: album,
					ignore: albumIgnore,
				})
			}
		}
	}

	deleteErrors := cleanup_tasks.DeleteOldUserAlbums(db, userAlbums, user)
	scanErrors = append(scanErrors, deleteErrors...)

	return userAlbums, scanErrors
}

func directoryContainsPhotos(rootPath string, cache *scanner_cache.AlbumScannerCache, albumIgnore []string) bool {

	if containsImage := cache.AlbumContainsPhotos(rootPath); containsImage != nil {
		return *containsImage
	}

	scanQueue := list.New()
	scanQueue.PushBack(rootPath)

	scannedDirectories := make([]string, 0)

	for scanQueue.Front() != nil {

		dirPath := scanQueue.Front().Value.(string)
		scanQueue.Remove(scanQueue.Front())

		scannedDirectories = append(scannedDirectories, dirPath)

		// Update ignore dir list
		photoviewIgnore, err := getPhotoviewIgnore(dirPath)
		if err != nil {
			log.Printf("Failed to get ignore file, err = %s", err)
		} else {
			albumIgnore = append(albumIgnore, photoviewIgnore...)
		}
		ignoreEntries := ignore.CompileIgnoreLines(albumIgnore...)

		dirContent, err := os.ReadDir(dirPath)
		if err != nil {
			scanner_utils.ScannerError(nil, "Could not read directory (%s): %s\n", dirPath, err.Error())
			return false
		}

		for _, fileInfo := range dirContent {
			filePath := path.Join(dirPath, fileInfo.Name())

			isDirSymlink, err := utils.IsDirSymlink(filePath)
			if err != nil {
				log.Printf("Cannot detect whether %s is symlink to a directory. Pretending it is not", filePath)
				isDirSymlink = false
			}

			if fileInfo.IsDir() || isDirSymlink {
				scanQueue.PushBack(filePath)
			} else {
				if cache.IsPathMedia(filePath) {
					if ignoreEntries.MatchesPath(fileInfo.Name()) {
						log.Printf("Match found %s, continue search for media", fileInfo.Name())
						continue
					}
					log.Printf("Insert Album %s %s, contains photo is true", dirPath, rootPath)
					cache.InsertAlbumPaths(dirPath, rootPath, true)
					return true
				}
			}
		}

	}

	for _, scanned_path := range scannedDirectories {
		log.Printf("Insert Album %s, contains photo is false", scanned_path)
		cache.InsertAlbumPath(scanned_path, false)
	}
	return false
}
