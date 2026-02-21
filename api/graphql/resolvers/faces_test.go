package resolvers

import (
	"context"
	"testing"

	"github.com/kkovaletp/photoview/api/graphql/auth"
	"github.com/kkovaletp/photoview/api/graphql/models"
	"github.com/kkovaletp/photoview/api/scanner/face_detection"
	"github.com/kkovaletp/photoview/api/test_utils"
)

func TestCombineFaceGroups(t *testing.T) {
	test_utils.FilesystemTest(t)
	db := test_utils.DatabaseTest(t)
	face_detection.InitializeFaceDetector(db)
	pass := "1234"
	user, err := models.RegisterUser(db, "test_user", &pass, true)
	if err != nil {
		t.Fatal("register user error:", err)
	}
	db.AutoMigrate(&models.ImageFace{}, &models.FaceGroup{}, &models.Media{}, &models.Album{})
	tests := []struct {
		name string
		dest int
		src  []int
	}{
		{
			name: "merge multiple combinations with duplicates",
			dest: 1,
			src:  []int{2, 3},
		},
		{
			name: "merge two combinations with duplicates",
			dest: 1,
			src:  []int{2},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {

			db.Exec("DELETE FROM image_faces")
			db.Exec("DELETE FROM face_groups")
			db.Exec("DELETE FROM media")
			db.Exec("DELETE FROM albums")

			testAlbum := models.Album{Title: "Test Album"}
			if err := db.Create(&testAlbum).Error; err != nil {
				t.Fatal(err)
			}

			testMedia := []models.Media{
				{Model: models.Model{ID: 1}, Path: "test1", AlbumID: testAlbum.ID},
				{Model: models.Model{ID: 2}, Path: "test2", AlbumID: testAlbum.ID},
				{Model: models.Model{ID: 3}, Path: "test3", AlbumID: testAlbum.ID},
				{Model: models.Model{ID: 4}, Path: "test4", AlbumID: testAlbum.ID},
			}
			if err := db.Create(&testMedia).Error; err != nil {
				t.Fatal(err)
			}

			testFaceGroup := []models.FaceGroup{
				{Model: models.Model{ID: 1}},
				{Model: models.Model{ID: 2}},
				{Model: models.Model{ID: 3}},
				{Model: models.Model{ID: 4}},
			}
			if err := db.Create(&testFaceGroup).Error; err != nil {
				t.Fatal(err)
			}

			testDataList := []models.ImageFace{
				{FaceGroupID: 1, MediaID: 1},
				{FaceGroupID: 1, MediaID: 2},
				{FaceGroupID: 1, MediaID: 3},
				{FaceGroupID: 2, MediaID: 3},
				{FaceGroupID: 2, MediaID: 4},
				{FaceGroupID: 3, MediaID: 4},
				{FaceGroupID: 3, MediaID: 1},
			}
			if err := db.Create(&testDataList).Error; err != nil {
				t.Fatal(err)
			}

			r := &mutationResolver{
				Resolver: &Resolver{
					database: db,
				},
			}
			ctx := auth.AddUserToContext(context.Background(), user)

			// Execute the merge operation
			_, err := r.CombineFaceGroups(ctx, tt.dest, tt.src)
			if err != nil {
				t.Fatal("CombineFaceGroups failed:", err)
			}

			// Query DB directly to verify deduplication
			// (The returned FaceGroup object doesn't have ImageFaces populated
			// because field resolvers only run in GraphQL context)
			var imageFaces []*models.ImageFace
			if err := db.Where("face_group_id = ?", tt.dest).Find(&imageFaces).Error; err != nil {
				t.Fatal("failed to query image faces:", err)
			}

			// Verify no duplicate MediaIDs exist
			seenMediaIDs := make(map[int]struct{})
			for _, imageface := range imageFaces {
				if _, exists := seenMediaIDs[imageface.MediaID]; exists {
					t.Fatalf("deduplication failed: MediaID %d appears multiple times in destination group", imageface.MediaID)
				}
				seenMediaIDs[imageface.MediaID] = struct{}{}
			}

			// Verify we actually have the expected media (not empty after merge)
			expectedMediaCount := 4 // After merging groups with media 1,2,3,4
			if len(imageFaces) != expectedMediaCount {
				t.Fatalf("expected %d unique image faces after merge, got %d", expectedMediaCount, len(imageFaces))
			}
		})
	}
}
