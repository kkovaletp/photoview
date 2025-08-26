package scanner

import (
	"fmt"
	"image"
	_ "image/jpeg"
	"log"
	"os"

	"github.com/buckket/go-blurhash"
	"github.com/kkovaletp/photoview/api/graphql/models"
	"gorm.io/gorm"
)

// GenerateBlurhashes queries the database for media that are missing a blurhash and computes one for them.
// This function blocks until all hashes have been computed
func GenerateBlurhashes(db *gorm.DB) error {
	var results []*models.Media

	processErrors := make([]error, 0)

	query := db.Model(&models.Media{}).
		Preload("MediaURL").
		Joins("INNER JOIN media_urls ON media.id = media_urls.media_id").
		Where("blurhash IS NULL").
		Where("media_urls.purpose IN ?", []string{"thumbnail", "video-thumbnail"})

	err := query.FindInBatches(&results, 50, func(tx *gorm.DB, batch int) error {
		log.Printf("generating %d blurhashes", len(results))

		updates := make(map[int]*string)

		for _, row := range results {
			thumbnail, err := row.GetThumbnail()
			if err != nil {
				log.Printf("failed to get thumbnail for media to generate blurhash (%d): %v", row.ID, err)
				processErrors = append(processErrors, err)
				continue
			}

			hashStr, err := GenerateBlurhashFromThumbnail(thumbnail)
			if err != nil {
				log.Printf("failed to generate blurhash: %v", err)
				processErrors = append(processErrors, err)
				continue
			}

			updates[row.ID] = &hashStr
		}

		// Batch update using a single UPDATE with CASE WHEN
		if len(updates) > 0 {
			// Build CASE WHEN statement for batch update
			caseSQL := "CASE id "
			args := make([]interface{}, 0, len(updates)*2)
			ids := make([]interface{}, 0, len(updates))

			for id, hash := range updates {
				caseSQL += "WHEN ? THEN ? "
				args = append(args, id, *hash)
				ids = append(ids, id)
			}
			caseSQL += "END"

			if err := tx.Model(&models.Media{}).
				Where("id IN ?", ids).
				Update("blurhash", gorm.Expr(caseSQL, args...)).Error; err != nil {
				return err
			}
		}

		return nil
	}).Error

	if err != nil {
		return err
	}

	if len(processErrors) == 0 {
		return nil
	} else {
		return fmt.Errorf("failed to generate %d blurhashes", len(processErrors))
	}
}

// GenerateBlurhashFromThumbnail generates a blurhash for the given thumbnail
func GenerateBlurhashFromThumbnail(thumbnail *models.MediaURL) (string, error) {
	thumbnailPath, err := thumbnail.CachedPath()
	if err != nil {
		return "", fmt.Errorf("get path of media id=%d error: %w", thumbnail.MediaID, err)
	}

	imageFile, err := os.Open(thumbnailPath)
	if err != nil {
		return "", fmt.Errorf("open %s error: %w", thumbnailPath, err)
	}
	defer imageFile.Close()

	imageData, _, err := image.Decode(imageFile)
	if err != nil {
		return "", fmt.Errorf("decode %q error: %w", thumbnailPath, err)
	}

	hashStr, err := blurhash.Encode(4, 3, imageData)
	if err != nil {
		return "", fmt.Errorf("encode blurhash of %q error: %w", thumbnailPath, err)
	}

	// if err := db.Model(&models.Media{}).Where("id = ?", thumbnail.MediaID).Update("blurhash", hashStr).Error; err != nil {
	// return "", fmt.Errorf("update blurhash of media id=%d error: %w", thumbnail.MediaID, err)
	// }

	return hashStr, nil
}
