package resolvers

// This file will be automatically regenerated based on the schema, any resolver implementations
// will be copied through when generating and any unknown code will be moved to the end.
// Code generated by github.com/99designs/gqlgen version v0.17.76

import (
	"context"
	"os"
	"path"

	"github.com/kkovaletp/photoview/api/graphql/auth"
	"github.com/kkovaletp/photoview/api/utils"
)

// MyMediaGeoJSON is the resolver for the myMediaGeoJson field.
func (r *queryResolver) MyMediaGeoJSON(ctx context.Context) (any, error) {
	user := auth.UserFromContext(ctx)
	if user == nil {
		return nil, auth.ErrUnauthorized
	}

	var media []*geoMedia

	err := r.DB(ctx).Table("media").
		Select("media.id AS media_id, media.title AS media_title, "+
			"media_urls.media_name AS thumbnail_name, media_urls.width AS thumbnail_width, "+
			"media_urls.height AS thumbnail_height, media_exif.gps_latitude AS latitude, "+
			"media_exif.gps_longitude AS longitude").
		Joins("INNER JOIN media_exif ON media.exif_id = media_exif.id").
		Joins("INNER JOIN media_urls ON media.id = media_urls.media_id").
		Joins("INNER JOIN user_albums ON media.album_id = user_albums.album_id").
		Where("media_exif.gps_latitude IS NOT NULL").
		Where("media_exif.gps_longitude IS NOT NULL").
		Where("media_urls.purpose = 'thumbnail'").
		Where("user_albums.user_id = ?", user.ID).
		Scan(&media).Error

	if err != nil {
		return nil, err
	}

	features := make([]geoJSONFeature, 0)

	for _, item := range media {
		geoPoint := makeGeoJSONFeatureGeometryPoint(item.Latitude, item.Longitude)

		thumbnailURL := utils.ApiEndpointUrl()
		thumbnailURL.Path = path.Join(thumbnailURL.Path, "photo", item.ThumbnailName)

		properties := geoJSONMediaProperties{
			MediaID:    item.MediaID,
			MediaTitle: item.MediaTitle,
			Thumbnail: struct {
				URL    string `json:"url"`
				Width  int    `json:"width"`
				Height int    `json:"height"`
			}{
				URL:    thumbnailURL.String(),
				Width:  item.ThumbnailWidth,
				Height: item.ThumbnailHeight,
			},
		}

		features = append(features, makeGeoJSONFeature(properties, geoPoint))
	}

	featureCollection := makeGeoJSONFeatureCollection(features)
	return featureCollection, nil
}

// MapboxToken is the resolver for the mapboxToken field.
func (r *queryResolver) MapboxToken(ctx context.Context) (*string, error) {
	mapboxTokenEnv := os.Getenv("MAPBOX_TOKEN")
	if mapboxTokenEnv == "" {
		return nil, nil
	}

	return &mapboxTokenEnv, nil
}
