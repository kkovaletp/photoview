package resolvers

// This file will be automatically regenerated based on the schema, any resolver implementations
// will be copied through when generating and any unknown code will be moved to the end.
// Code generated by github.com/99designs/gqlgen version v0.17.76

import (
	"context"
	"errors"
	"fmt"

	api "github.com/kkovaletp/photoview/api/graphql"
	"github.com/kkovaletp/photoview/api/graphql/auth"
	"github.com/kkovaletp/photoview/api/graphql/models"
	"github.com/kkovaletp/photoview/api/graphql/models/actions"
	"gorm.io/gorm"
)

// Media is the resolver for the media field.
func (r *albumResolver) Media(ctx context.Context, obj *models.Album, order *models.Ordering, paginate *models.Pagination, onlyFavorites *bool) ([]*models.Media, error) {
	db := r.DB(ctx)

	query := db.
		Where("media.album_id = ?", obj.ID).
		Where("media.id IN (?)", db.Model(&models.MediaURL{}).
			Select("media_urls.media_id").
			Where("media_urls.media_id = media.id"))

	if onlyFavorites != nil && *onlyFavorites == true {
		user := auth.UserFromContext(ctx)
		if user == nil {
			return nil, errors.New("cannot get favorite media without being authorized")
		}

		favoriteQuery := db.Model(&models.UserMediaData{
			UserID: user.ID,
		}).Where("user_media_data.media_id = media.id").Where("user_media_data.favorite = true")

		query = query.Where("EXISTS (?)", favoriteQuery)
	}

	query = models.FormatSQL(query, order, paginate)

	var media []*models.Media
	if err := query.Find(&media).Error; err != nil {
		return nil, err
	}

	return media, nil
}

// SubAlbums is the resolver for the subAlbums field.
func (r *albumResolver) SubAlbums(ctx context.Context, obj *models.Album, order *models.Ordering, paginate *models.Pagination) ([]*models.Album, error) {
	var albums []*models.Album

	query := r.DB(ctx).Where("parent_album_id = ?", obj.ID)
	query = models.FormatSQL(query, order, paginate)

	if err := query.Find(&albums).Error; err != nil {
		return nil, err
	}

	return albums, nil
}

// Owner is the resolver for the owner field.
func (r *albumResolver) Owner(ctx context.Context, obj *models.Album) (*models.User, error) {
	panic("not implemented")
}

// Thumbnail is the resolver for the thumbnail field.
func (r *albumResolver) Thumbnail(ctx context.Context, obj *models.Album) (*models.Media, error) {
	return obj.Thumbnail(r.DB(ctx))
}

// Path is the resolver for the path field.
func (r *albumResolver) Path(ctx context.Context, obj *models.Album) ([]*models.Album, error) {
	user := auth.UserFromContext(ctx)
	if user == nil {
		empty := make([]*models.Album, 0)
		return empty, nil
	}

	return actions.AlbumPath(r.DB(ctx), user, obj)
}

// Shares is the resolver for the shares field.
func (r *albumResolver) Shares(ctx context.Context, obj *models.Album) ([]*models.ShareToken, error) {
	var shareTokens []*models.ShareToken
	if err := r.DB(ctx).Where("album_id = ?", obj.ID).Find(&shareTokens).Error; err != nil {
		return nil, err
	}

	return shareTokens, nil
}

// Takes album_id, resets album.cover_id to 0 (null)
func (r *mutationResolver) ResetAlbumCover(ctx context.Context, albumID int) (*models.Album, error) {
	user := auth.UserFromContext(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	return actions.ResetAlbumCover(r.DB(ctx), user, albumID)
}

// SetAlbumCover is the resolver for the setAlbumCover field.
func (r *mutationResolver) SetAlbumCover(ctx context.Context, coverID int) (*models.Album, error) {
	user := auth.UserFromContext(ctx)
	if user == nil {
		return nil, errors.New("unauthorized")
	}

	return actions.SetAlbumCover(r.DB(ctx), user, coverID)
}

// MyAlbums is the resolver for the myAlbums field.
func (r *queryResolver) MyAlbums(ctx context.Context, order *models.Ordering, paginate *models.Pagination, onlyRoot *bool, showEmpty *bool, onlyWithFavorites *bool) ([]*models.Album, error) {
	user := auth.UserFromContext(ctx)
	if user == nil {
		return nil, auth.ErrUnauthorized
	}

	return actions.MyAlbums(r.DB(ctx), user, order, paginate, onlyRoot, showEmpty, onlyWithFavorites)
}

// Album is the resolver for the album field.
func (r *queryResolver) Album(ctx context.Context, id int, tokenCredentials *models.ShareTokenCredentials) (*models.Album, error) {
	db := r.DB(ctx)
	if tokenCredentials != nil {

		shareToken, err := r.ShareToken(ctx, *tokenCredentials)
		if err != nil {
			return nil, err
		}

		if shareToken.Album != nil {
			if *shareToken.AlbumID == id {
				return shareToken.Album, nil
			}

			subAlbum, err := shareToken.Album.GetChildren(db, func(query *gorm.DB) *gorm.DB {
				return query.Where("sub_albums.id = ?", id)
			})
			if err != nil {
				return nil, fmt.Errorf("find sub album of share token (%s): %w", tokenCredentials.Token, err)
			}

			if len(subAlbum) > 0 {
				return subAlbum[0], nil
			}
		}
	}

	user := auth.UserFromContext(ctx)
	if user == nil {
		return nil, auth.ErrUnauthorized
	}

	return actions.Album(db, user, id)
}

// Album returns api.AlbumResolver implementation.
func (r *Resolver) Album() api.AlbumResolver { return &albumResolver{r} }

type albumResolver struct{ *Resolver }
