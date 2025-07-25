package actions_test

import (
	"testing"

	"github.com/kkovaletp/photoview/api/graphql/models"
	"github.com/kkovaletp/photoview/api/graphql/models/actions"
	"github.com/kkovaletp/photoview/api/test_utils"
	"github.com/stretchr/testify/assert"
)

func TestAlbumPath(t *testing.T) {
	db := test_utils.DatabaseTest(t)

	album := models.Album{
		Title: "Three",
		Path:  "/one/two/three",
		ParentAlbum: &models.Album{
			Title: "Two",
			Path:  "/one/two",
			ParentAlbum: &models.Album{
				Title: "One",
				Path:  "/one",
			},
		},
	}

	assert.NoError(t, db.Save(&album).Error)

	user, err := models.RegisterUser(db, "user", nil, false)
	assert.NoError(t, err)

	db.Model(&user).Association("Albums").Append(album.ParentAlbum.ParentAlbum)

	albumPath, err := actions.AlbumPath(db, user, &album)
	assert.NoError(t, err)
	assert.Len(t, albumPath, 2)
	assert.Equal(t, "Two", albumPath[0].Title)
	assert.Equal(t, "One", albumPath[1].Title)
}

func TestAlbumCover(t *testing.T) {
	db := test_utils.DatabaseTest(t)

	rootAlbum := models.Album{
		Title: "root",
		Path:  "/photos",
	}

	if !assert.NoError(t, db.Save(&rootAlbum).Error) {
		return
	}

	children := []models.Album{
		{
			Title:         "child1",
			Path:          "/photos/child1",
			ParentAlbumID: &rootAlbum.ID,
		},
		{
			Title:         "child2",
			Path:          "/photos/child2",
			ParentAlbumID: &rootAlbum.ID,
		},
	}

	if !assert.NoError(t, db.Save(&children).Error) {
		return
	}

	photos := []models.Media{
		{
			Title:   "pic1",
			Path:    "/photos/pic1",
			AlbumID: rootAlbum.ID,
		},
		{
			Title:   "pic2",
			Path:    "/photos/pic2",
			AlbumID: rootAlbum.ID,
		},
		{
			Title:   "pic3",
			Path:    "/photos/child1/pic3",
			AlbumID: children[0].ID,
		},
		{
			Title:   "pic4",
			Path:    "/photos/child1/pic4",
			AlbumID: children[0].ID,
		},
		{
			Title:   "pic5",
			Path:    "/photos/child2/pic5",
			AlbumID: children[1].ID,
		},
		{
			Title:   "pic6",
			Path:    "/photos/child2/pic6",
			AlbumID: children[1].ID,
		},
	}

	if !assert.NoError(t, db.Save(&photos).Error) {
		return
	}

	if !assert.NoError(t, db.Model(&children[0]).Update("cover_id", &photos[3].ID).Error) {
		return
	}

	photoUrls := []models.MediaURL{
		{
			MediaID: photos[0].ID,
			Media:   &photos[0],
		},
		{
			MediaID: photos[1].ID,
			Media:   &photos[1],
		},
		{
			MediaID: photos[2].ID,
			Media:   &photos[2],
		},
		{
			MediaID: photos[3].ID,
			Media:   &photos[3],
		},
		{
			MediaID: photos[4].ID,
			Media:   &photos[4],
		},
		{
			MediaID: photos[5].ID,
			Media:   &photos[5],
		},
	}

	if !assert.NoError(t, db.Save(&photoUrls).Error) {
		return
	}

	userPass := "password"
	regularUser, err := models.RegisterUser(db, "user1", &userPass, false)
	if !assert.NoError(t, err) {
		return
	}

	if !assert.NoError(t, db.Model(&regularUser).Association("Albums").Append(&rootAlbum)) {
		return
	}

	if !assert.NoError(t, db.Model(&regularUser).Association("Albums").Append(&children)) {
		return
	}

	// Single test since we cannot rely on the tests being performed sequentially
	t.Run("Album get and reset cover photos", func(t *testing.T) {
		{
			album, err := actions.Album(db, regularUser, rootAlbum.ID)
			assert.NoError(t, err)

			albumThumb, err := album.Thumbnail(db)
			assert.NoError(t, err)

			// Should return the latest photo since no coverID has been set
			assert.EqualValues(t, "pic6", albumThumb.Title)
		}

		{
			album, err := actions.Album(db, regularUser, children[0].ID)
			assert.NoError(t, err)

			albumThumb, err := album.Thumbnail(db)
			assert.NoError(t, err)

			// coverID has already been set
			assert.EqualValues(t, "pic4", albumThumb.Title)
		}

		resetAlbum, err := actions.ResetAlbumCover(db, regularUser, children[0].ID)
		assert.NoError(t, err)

		assert.Nil(t, resetAlbum.CoverID)

		resetThumb, err := resetAlbum.Thumbnail(db)
		assert.NoError(t, err)

		assert.Equal(t, "pic4", resetThumb.Title)
	})

	t.Run("Album change cover photos", func(t *testing.T) {
		assert.Nil(t, children[1].CoverID)

		album, err := actions.SetAlbumCover(db, regularUser, photos[4].ID)
		assert.NoError(t, err)

		assert.Equal(t, children[1].ID, album.ID)
		assert.NotNil(t, album.CoverID)
		assert.Equal(t, photos[4].ID, *album.CoverID)

		albumThumb, err := album.Thumbnail(db)
		assert.NoError(t, err)

		assert.Equal(t, photos[4].ID, albumThumb.ID)
	})

}

func TestAlbumsSingleRootExpand(t *testing.T) {
	db := test_utils.DatabaseTest(t)
	boolFalse := false
	boolTrue := true

	unrelatedAlbum := models.Album{
		Title: "unrelated_album",
		Path:  "/another_place",
	}
	err := db.Create(&unrelatedAlbum).Error
	assert.NoError(t, err)

	user, err := models.RegisterUser(db, "user", nil, false)
	assert.NoError(t, err)

	rootAlbum := models.Album{
		Title: "root",
		Path:  "/root",
	}

	err = db.Model(&user).Association("Albums").Replace(&rootAlbum)
	assert.NoError(t, err)

	t.Run("Single root album, no children", func(t *testing.T) {
		returnedAlbums, err := actions.MyAlbums(db, user, nil, nil, &boolTrue, &boolTrue, &boolFalse)
		assert.NoError(t, err)

		assert.Len(t, returnedAlbums, 1)
	})

	childAlbums := []models.Album{
		{
			Title:         "child1",
			Path:          "/root/child1",
			ParentAlbumID: &rootAlbum.ID,
		},
		{
			Title:         "child2",
			Path:          "/root/child2",
			ParentAlbumID: &rootAlbum.ID,
		},
		{
			Title:         "child3",
			Path:          "/root/child3",
			ParentAlbumID: &rootAlbum.ID,
		},
	}

	err = db.Model(&user).Association("Albums").Append(&childAlbums)
	assert.NoError(t, err)

	t.Run("Single root album, multiple children", func(t *testing.T) {

		returnedAlbums, err := actions.MyAlbums(db, user, nil, nil, &boolTrue, &boolTrue, &boolFalse)
		assert.NoError(t, err)

		assert.Len(t, returnedAlbums, 3)
	})

}

// Related to #658
func TestNonRootAlbumPath(t *testing.T) {
	db := test_utils.DatabaseTest(t)

	boolTrue := true
	boolFalse := false

	rootAlbum := models.Album{
		Title: "root",
		Path:  "/root",
	}

	childAlbum := models.Album{
		Title:         "child",
		Path:          "/root/child",
		ParentAlbumID: &rootAlbum.ID,
	}

	assert.NoError(t, db.Create(&rootAlbum).Error)

	// Register user
	user, err := models.RegisterUser(db, "user", nil, false)
	assert.NoError(t, err)

	// Assign album to user
	err = db.Model(&user).Association("Albums").Append(&childAlbum)
	assert.NoError(t, err)

	// The child album is a "local root album" for the user, as it does not have access to the root album
	t.Run("User should only see child album", func(t *testing.T) {
		returnedAlbums, err := actions.MyAlbums(db, user, nil, nil, &boolTrue, &boolTrue, &boolFalse)
		assert.NoError(t, err)

		assert.Len(t, returnedAlbums, 1)
		assert.Equal(t, "child", returnedAlbums[0].Title)
	})
}

// Related to #658
func TestNonRootAlbumPathMultipleUsers(t *testing.T) {
	db := test_utils.DatabaseTest(t)

	boolTrue := true
	boolFalse := false

	rootAlbum := models.Album{
		Title: "root",
		Path:  "/root",
	}

	child1Album := models.Album{
		Title:         "child1",
		Path:          "/root/child1",
		ParentAlbumID: &rootAlbum.ID,
	}

	child2Album := models.Album{
		Title:         "child2",
		Path:          "/root/child2",
		ParentAlbumID: &rootAlbum.ID,
	}

	// Admin should have access to all albums
	adminAlbums := []*models.Album{&rootAlbum, &child1Album, &child2Album}

	assert.NoError(t, db.Create(&rootAlbum).Error)

	// Register users
	admin, err := models.RegisterUser(db, "admin", nil, false)
	assert.NoError(t, err)

	user1, err := models.RegisterUser(db, "user1", nil, false)
	assert.NoError(t, err)

	user2, err := models.RegisterUser(db, "user2", nil, false)
	assert.NoError(t, err)

	// Assign albums to users
	err = db.Model(&admin).Association("Albums").Append(&adminAlbums)
	assert.NoError(t, err)

	err = db.Model(&user1).Association("Albums").Append(&child1Album)
	assert.NoError(t, err)

	err = db.Model(&user2).Association("Albums").Append(&child2Album)
	assert.NoError(t, err)

	t.Run("Admin should see all albums", func(t *testing.T) {
		returnedAlbums, err := actions.MyAlbums(db, admin, nil, nil, &boolTrue, &boolTrue, &boolFalse)
		assert.NoError(t, err)

		assert.Len(t, returnedAlbums, 2)
		assert.Equal(t, "child1", returnedAlbums[0].Title)
		assert.Equal(t, "child2", returnedAlbums[1].Title)
	})

	t.Run("User 1 should only see child1 album", func(t *testing.T) {
		returnedAlbums, err := actions.MyAlbums(db, user1, nil, nil, &boolTrue, &boolTrue, &boolFalse)
		assert.NoError(t, err)

		assert.Len(t, returnedAlbums, 1)
		assert.Equal(t, "child1", returnedAlbums[0].Title)
	})

	t.Run("User 2 should only see child2 album", func(t *testing.T) {
		returnedAlbums, err := actions.MyAlbums(db, user2, nil, nil, &boolTrue, &boolTrue, &boolFalse)
		assert.NoError(t, err)

		assert.Len(t, returnedAlbums, 1)
		assert.Equal(t, "child2", returnedAlbums[0].Title)
	})
}
