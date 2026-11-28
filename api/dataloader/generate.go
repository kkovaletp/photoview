package dataloader

//go:generate sh -c "go tool github.com/vektah/dataloaden MediaURLLoader int '*github.com/kkovaletp/photoview/api/graphql/models.MediaURL' && mv mediaurlloader_gen.go gen_mediaurlloader.go"
//go:generate sh -c "go tool github.com/vektah/dataloaden UserLoader string '*github.com/kkovaletp/photoview/api/graphql/models.User' && mv userloader_gen.go gen_userloader.go"
//go:generate sh -c "go tool github.com/vektah/dataloaden UserFavoritesLoader '*github.com/kkovaletp/photoview/api/graphql/models.UserMediaData' bool && mv userfavoritesloader_gen.go gen_userfavoritesloader.go"
