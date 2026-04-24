export type Maybe<T> = T | null
export type InputMaybe<T> = Maybe<T>
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K]
}
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>
}
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>
}
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T
> = { [_ in K]?: never }
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never
    }
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string }
  String: { input: string; output: string }
  Boolean: { input: boolean; output: boolean }
  Int: { input: number; output: number }
  Float: { input: number; output: number }
  Any: { input: any; output: any }
  Time: { input: string; output: string }
}

export type Album = {
  __typename?: 'Album'
  /** The path on the filesystem of the server, where this album is located */
  filePath: Scalars['String']['output']
  id: Scalars['ID']['output']
  /** The media inside this album */
  media: Array<Media>
  /** The user who owns this album */
  owner: User
  /** The album which contains this album */
  parentAlbum?: Maybe<Album>
  /** A breadcrumb list of all parent albums down to this one */
  path: Array<Album>
  /** A list of share tokens pointing to this album, owned by the logged in user */
  shares: Array<ShareToken>
  /** The albums contained in this album */
  subAlbums: Array<Album>
  /** An image in this album used for previewing this album */
  thumbnail?: Maybe<Media>
  title: Scalars['String']['output']
}

export type AlbumMediaArgs = {
  onlyFavorites?: InputMaybe<Scalars['Boolean']['input']>
  order?: InputMaybe<Ordering>
  paginate?: InputMaybe<Pagination>
}

export type AlbumSubAlbumsArgs = {
  order?: InputMaybe<Ordering>
  paginate?: InputMaybe<Pagination>
}

export type AuthorizeResult = {
  __typename?: 'AuthorizeResult'
  /** A textual status message describing the result, can be used to show an error message when `success` is false */
  status: Scalars['String']['output']
  success: Scalars['Boolean']['output']
  /** An access token used to authenticate new API requests as the newly authorized user. Is present when success is true */
  token?: Maybe<Scalars['String']['output']>
}

export type Coordinates = {
  __typename?: 'Coordinates'
  /** GPS latitude in degrees */
  latitude: Scalars['Float']['output']
  /** GPS longitude in degrees */
  longitude: Scalars['Float']['output']
}

/** A collection of faces of a particular person */
export type FaceGroup = {
  __typename?: 'FaceGroup'
  id: Scalars['ID']['output']
  /** The total number of images in this collection */
  imageFaceCount: Scalars['Int']['output']
  imageFaces: Array<ImageFace>
  /** The name of the person */
  label?: Maybe<Scalars['String']['output']>
}

/** A collection of faces of a particular person */
export type FaceGroupImageFacesArgs = {
  paginate?: InputMaybe<Pagination>
}

/** A bounding box of where a face is present on an image. The values map from 0 to 1 as a fraction of the image width/height */
export type FaceRectangle = {
  __typename?: 'FaceRectangle'
  maxX: Scalars['Float']['output']
  maxY: Scalars['Float']['output']
  minX: Scalars['Float']['output']
  minY: Scalars['Float']['output']
}

/** A single face on a particular image */
export type ImageFace = {
  __typename?: 'ImageFace'
  /** The `FaceGroup` that contains this `ImageFace` */
  faceGroup: FaceGroup
  id: Scalars['ID']['output']
  /** A reference to the image the face appears on */
  media: Media
  /** A bounding box of where on the image the face is present */
  rectangle: FaceRectangle
}

/** Supported language translations of the user interface */
export enum LanguageTranslation {
  Basque = 'Basque',
  Danish = 'Danish',
  Dutch = 'Dutch',
  English = 'English',
  French = 'French',
  German = 'German',
  Italian = 'Italian',
  Japanese = 'Japanese',
  Polish = 'Polish',
  Portuguese = 'Portuguese',
  Russian = 'Russian',
  SimplifiedChinese = 'SimplifiedChinese',
  Spanish = 'Spanish',
  Swedish = 'Swedish',
  TraditionalChineseHk = 'TraditionalChineseHK',
  TraditionalChineseTw = 'TraditionalChineseTW',
  Turkish = 'Turkish',
  Ukrainian = 'Ukrainian',
}

export type Media = {
  __typename?: 'Media'
  /** The album that holds the media */
  album: Album
  /** A short string that can be used to generate a blured version of the media, to show while the original is loading */
  blurhash?: Maybe<Scalars['String']['output']>
  /** The date the image was shot or the date it was imported as a fallback */
  date: Scalars['Time']['output']
  /** A list of different versions of files for this media that can be downloaded by the user */
  downloads: Array<MediaDownload>
  exif?: Maybe<MediaExif>
  /** A list of faces present on the image */
  faces: Array<ImageFace>
  favorite: Scalars['Boolean']['output']
  /** URL to display the photo in full resolution, will be null for videos */
  highRes?: Maybe<MediaUrl>
  id: Scalars['ID']['output']
  /** Local filepath for the media */
  path: Scalars['String']['output']
  /** A list of share tokens pointing to this media, owned byt the logged in user */
  shares: Array<ShareToken>
  /** URL to display the media in a smaller resolution */
  thumbnail?: Maybe<MediaUrl>
  title: Scalars['String']['output']
  type: MediaType
  videoMetadata?: Maybe<VideoMetadata>
  /** URL to get the video in a web format that can be played in the browser, will be null for photos */
  videoWeb?: Maybe<MediaUrl>
}

export type MediaDownload = {
  __typename?: 'MediaDownload'
  mediaUrl: MediaUrl
  /** A description of the role of the media file */
  title: Scalars['String']['output']
}

/** EXIF metadata from the camera */
export type MediaExif = {
  __typename?: 'MediaEXIF'
  /** The aperature stops of the image */
  aperture?: Maybe<Scalars['Float']['output']>
  /** The model name of the camera */
  camera?: Maybe<Scalars['String']['output']>
  /** GPS coordinates of where the image was taken */
  coordinates?: Maybe<Coordinates>
  /** The date when the photo is shot */
  dateShot?: Maybe<Scalars['String']['output']>
  /** The description of the image */
  description?: Maybe<Scalars['String']['output']>
  /** The exposure time of the image */
  exposure?: Maybe<Scalars['Float']['output']>
  /** An index describing the mode for adjusting the exposure of the image */
  exposureProgram?: Maybe<Scalars['Int']['output']>
  /** A formatted description of the flash settings, when the image was taken */
  flash?: Maybe<Scalars['Int']['output']>
  /** The focal length of the lens, when the image was taken */
  focalLength?: Maybe<Scalars['Float']['output']>
  id: Scalars['ID']['output']
  /** The ISO setting of the image */
  iso?: Maybe<Scalars['Int']['output']>
  /** The name of the lens */
  lens?: Maybe<Scalars['String']['output']>
  /** The maker of the camera */
  maker?: Maybe<Scalars['String']['output']>
  media: Media
}

export enum MediaType {
  Photo = 'Photo',
  Video = 'Video',
}

export type MediaUrl = {
  __typename?: 'MediaURL'
  /** The file size of the resource in bytes */
  fileSize: Scalars['Int']['output']
  /** Height of the image in pixels */
  height: Scalars['Int']['output']
  /** URL for previewing the image */
  url: Scalars['String']['output']
  /** Width of the image in pixels */
  width: Scalars['Int']['output']
}

export type Mutation = {
  __typename?: 'Mutation'
  /** Authorizes a user and returns a token used to identify the new session */
  authorizeUser: AuthorizeResult
  /** Change user preferences for the logged in user */
  changeUserPreferences: UserPreferences
  /** Merge two face groups into a single one, all ImageFaces from source will be moved to destination */
  combineFaceGroups: FaceGroup
  /** Create a new user */
  createUser: User
  /** Delete a share token by it's token value */
  deleteShareToken: ShareToken
  /** Delete an existing user */
  deleteUser: User
  /** Move a list of ImageFaces to a new face group */
  detachImageFaces: FaceGroup
  /** Mark or unmark a media as being a favorite */
  favoriteMedia: Media
  /** Registers the initial user, can only be called if initialSetup from SiteInfo is true */
  initialSetupWizard?: Maybe<AuthorizeResult>
  /** Move a list of ImageFaces to another face group */
  moveImageFaces: FaceGroup
  /** Set a password for a token, if null is passed for the password argument, the password will be cleared */
  protectShareToken: ShareToken
  /** Check all unlabeled faces to see if they match a labeled FaceGroup, and move them if they match */
  recognizeUnlabeledFaces: Array<ImageFace>
  /** Reset the assigned cover photo for an album */
  resetAlbumCover: Album
  /** Scan all users for new media */
  scanAll: ScannerResult
  /** Scan a single user for new media */
  scanUser: ScannerResult
  /** Assign a cover photo to an album */
  setAlbumCover: Album
  /** Set an Expiration Time for a token */
  setExpireShareToken: ShareToken
  /** Assign a label to a face group, set label to null to remove the current one */
  setFaceGroupLabel: FaceGroup
  /**
   * Set how often, in seconds, the server should automatically scan for new media,
   * a value of 0 will disable periodic scans
   */
  setPeriodicScanInterval: Scalars['Int']['output']
  /** Set max number of concurrent scanner jobs running at once */
  setScannerConcurrentWorkers: Scalars['Int']['output']
  /** Generate share token for album */
  shareAlbum: ShareToken
  /** Generate share token for media */
  shareMedia: ShareToken
  /** Update a user, fields left as `null` will not be changed */
  updateUser: User
  /** Add a root path from where to look for media for the given user, specified by their user id. */
  userAddRootPath?: Maybe<Album>
  /**
   * Remove a root path from a user, specified by the id of the user and the top album representing the root path.
   * This album was returned when creating the path using `userAddRootPath`.
   * A list of root paths for a particular user can be retrived from the `User.rootAlbums` path.
   */
  userRemoveRootAlbum?: Maybe<Album>
}

export type MutationAuthorizeUserArgs = {
  password: Scalars['String']['input']
  username: Scalars['String']['input']
}

export type MutationChangeUserPreferencesArgs = {
  language?: InputMaybe<Scalars['String']['input']>
}

export type MutationCombineFaceGroupsArgs = {
  destinationFaceGroupID: Scalars['ID']['input']
  sourceFaceGroupIDs: Array<Scalars['ID']['input']>
}

export type MutationCreateUserArgs = {
  admin: Scalars['Boolean']['input']
  password?: InputMaybe<Scalars['String']['input']>
  username: Scalars['String']['input']
}

export type MutationDeleteShareTokenArgs = {
  token: Scalars['String']['input']
}

export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input']
}

export type MutationDetachImageFacesArgs = {
  imageFaceIDs: Array<Scalars['ID']['input']>
}

export type MutationFavoriteMediaArgs = {
  favorite: Scalars['Boolean']['input']
  mediaId: Scalars['ID']['input']
}

export type MutationInitialSetupWizardArgs = {
  password: Scalars['String']['input']
  rootPath: Scalars['String']['input']
  username: Scalars['String']['input']
}

export type MutationMoveImageFacesArgs = {
  destinationFaceGroupID: Scalars['ID']['input']
  imageFaceIDs: Array<Scalars['ID']['input']>
}

export type MutationProtectShareTokenArgs = {
  password?: InputMaybe<Scalars['String']['input']>
  token: Scalars['String']['input']
}

export type MutationResetAlbumCoverArgs = {
  albumID: Scalars['ID']['input']
}

export type MutationScanUserArgs = {
  userId: Scalars['ID']['input']
}

export type MutationSetAlbumCoverArgs = {
  coverID: Scalars['ID']['input']
}

export type MutationSetExpireShareTokenArgs = {
  expire?: InputMaybe<Scalars['Time']['input']>
  token: Scalars['String']['input']
}

export type MutationSetFaceGroupLabelArgs = {
  faceGroupID: Scalars['ID']['input']
  label?: InputMaybe<Scalars['String']['input']>
}

export type MutationSetPeriodicScanIntervalArgs = {
  interval: Scalars['Int']['input']
}

export type MutationSetScannerConcurrentWorkersArgs = {
  workers: Scalars['Int']['input']
}

export type MutationShareAlbumArgs = {
  albumId: Scalars['ID']['input']
  expire?: InputMaybe<Scalars['Time']['input']>
  password?: InputMaybe<Scalars['String']['input']>
}

export type MutationShareMediaArgs = {
  expire?: InputMaybe<Scalars['Time']['input']>
  mediaId: Scalars['ID']['input']
  password?: InputMaybe<Scalars['String']['input']>
}

export type MutationUpdateUserArgs = {
  admin?: InputMaybe<Scalars['Boolean']['input']>
  id: Scalars['ID']['input']
  password?: InputMaybe<Scalars['String']['input']>
  username?: InputMaybe<Scalars['String']['input']>
}

export type MutationUserAddRootPathArgs = {
  id: Scalars['ID']['input']
  rootPath: Scalars['String']['input']
}

export type MutationUserRemoveRootAlbumArgs = {
  albumId: Scalars['ID']['input']
  userId: Scalars['ID']['input']
}

export type Notification = {
  __typename?: 'Notification'
  /** The text for the body of the notification */
  content: Scalars['String']['output']
  /** The text for the title of the notification */
  header: Scalars['String']['output']
  /** A key used to identify the notification, new notification updates with the same key, should replace the old notifications */
  key: Scalars['String']['output']
  /** Whether or not the message of the notification is negative, the UI might reflect this with a red color */
  negative: Scalars['Boolean']['output']
  /** Whether or not the message of the notification is positive, the UI might reflect this with a green color */
  positive: Scalars['Boolean']['output']
  /** A value between 0 and 1 when the notification type is `Progress` */
  progress?: Maybe<Scalars['Float']['output']>
  /** Time in milliseconds before the notification should close */
  timeout?: Maybe<Scalars['Int']['output']>
  type: NotificationType
}

/** Specified the type a particular notification is of */
export enum NotificationType {
  /** Close a notification with a given key */
  Close = 'Close',
  /** A regular message with no special additions */
  Message = 'Message',
  /** A notification with an attached progress indicator */
  Progress = 'Progress',
}

/** Used to specify which order to sort items in */
export enum OrderDirection {
  /** Sort accending A-Z */
  Asc = 'ASC',
  /** Sort decending Z-A */
  Desc = 'DESC',
}

/** Used to specify how to sort items */
export type Ordering = {
  /** A column in the database to order by */
  order_by?: InputMaybe<Scalars['String']['input']>
  order_direction?: InputMaybe<OrderDirection>
}

/** Used to specify pagination on a list of items */
export type Pagination = {
  /** How many items to maximally fetch */
  limit?: InputMaybe<Scalars['Int']['input']>
  /** How many items to skip from the beginning of the query, specified by the `Ordering` */
  offset?: InputMaybe<Scalars['Int']['input']>
}

export type Query = {
  __typename?: 'Query'
  /**
   * Get album by id, user must own the album or be admin
   * If valid tokenCredentials are provided, the album may be retrived without further authentication
   */
  album: Album
  /** Get a particular `FaceGroup` specified by its ID */
  faceGroup: FaceGroup
  /** Get the mapbox api token, returns null if mapbox is not enabled */
  mapboxToken?: Maybe<Scalars['String']['output']>
  /**
   * Get media by id, user must own the media or be admin.
   * If valid tokenCredentials are provided, the media may be retrived without further authentication
   */
  media: Media
  /** Get a list of media by their ids, user must own the media or be admin */
  mediaList: Array<Media>
  /** List of albums owned by the logged in user. */
  myAlbums: Array<Album>
  /** Get a list of `FaceGroup`s for the logged in user */
  myFaceGroups: Array<FaceGroup>
  /** List of media owned by the logged in user */
  myMedia: Array<Media>
  /** Get media owned by the logged in user, returned in GeoJson format */
  myMediaGeoJson: Scalars['Any']['output']
  /** Get a list of media, ordered first by day, then by album if multiple media was found for the same day. */
  myTimeline: Array<Media>
  /** Information about the currently logged in user */
  myUser: User
  /** User preferences for the logged in user */
  myUserPreferences: UserPreferences
  /** Perform a search query on the contents of the media library */
  search: SearchResult
  /** Fetch a share token containing an `Album` or `Media` */
  shareToken: ShareToken
  /** Check if the `ShareToken` credentials are valid */
  shareTokenValidatePassword: Scalars['Boolean']['output']
  siteInfo: SiteInfo
  /** List of registered users, must be admin to call */
  user: Array<User>
}

export type QueryAlbumArgs = {
  id: Scalars['ID']['input']
  tokenCredentials?: InputMaybe<ShareTokenCredentials>
}

export type QueryFaceGroupArgs = {
  id: Scalars['ID']['input']
}

export type QueryMediaArgs = {
  id: Scalars['ID']['input']
  tokenCredentials?: InputMaybe<ShareTokenCredentials>
}

export type QueryMediaListArgs = {
  ids: Array<Scalars['ID']['input']>
}

export type QueryMyAlbumsArgs = {
  onlyRoot?: InputMaybe<Scalars['Boolean']['input']>
  onlyWithFavorites?: InputMaybe<Scalars['Boolean']['input']>
  order?: InputMaybe<Ordering>
  paginate?: InputMaybe<Pagination>
  showEmpty?: InputMaybe<Scalars['Boolean']['input']>
}

export type QueryMyFaceGroupsArgs = {
  paginate?: InputMaybe<Pagination>
}

export type QueryMyMediaArgs = {
  order?: InputMaybe<Ordering>
  paginate?: InputMaybe<Pagination>
}

export type QueryMyTimelineArgs = {
  fromDate?: InputMaybe<Scalars['Time']['input']>
  onlyFavorites?: InputMaybe<Scalars['Boolean']['input']>
  paginate?: InputMaybe<Pagination>
}

export type QuerySearchArgs = {
  limitAlbums?: InputMaybe<Scalars['Int']['input']>
  limitMedia?: InputMaybe<Scalars['Int']['input']>
  query: Scalars['String']['input']
}

export type QueryShareTokenArgs = {
  credentials: ShareTokenCredentials
}

export type QueryShareTokenValidatePasswordArgs = {
  credentials: ShareTokenCredentials
}

export type QueryUserArgs = {
  order?: InputMaybe<Ordering>
  paginate?: InputMaybe<Pagination>
}

export type ScannerResult = {
  __typename?: 'ScannerResult'
  finished: Scalars['Boolean']['output']
  message?: Maybe<Scalars['String']['output']>
  progress?: Maybe<Scalars['Float']['output']>
  success: Scalars['Boolean']['output']
}

export type SearchResult = {
  __typename?: 'SearchResult'
  /** A list of albums that matched the query */
  albums: Array<Album>
  /** A list of media that matched the query */
  media: Array<Media>
  /** The string that was searched for */
  query: Scalars['String']['output']
}

/** A token used to publicly access an album or media */
export type ShareToken = {
  __typename?: 'ShareToken'
  /** The album this token shares */
  album?: Maybe<Album>
  /** Optional expire date */
  expire?: Maybe<Scalars['Time']['output']>
  /** Whether or not a password is needed to access the share */
  hasPassword: Scalars['Boolean']['output']
  id: Scalars['ID']['output']
  /** The media this token shares */
  media?: Maybe<Media>
  /** The user who created the token */
  owner: User
  token: Scalars['String']['output']
}

/** Credentials used to identify and authenticate a share token */
export type ShareTokenCredentials = {
  password?: InputMaybe<Scalars['String']['input']>
  token: Scalars['String']['input']
}

/** General information about the site */
export type SiteInfo = {
  __typename?: 'SiteInfo'
  /** How many max concurrent scanner jobs that should run at once */
  concurrentWorkers: Scalars['Int']['output']
  /** Whether or not face detection is enabled and working */
  faceDetectionEnabled: Scalars['Boolean']['output']
  /** Whether or not the initial setup wizard should be shown */
  initialSetup: Scalars['Boolean']['output']
  /** How often automatic scans should be initiated in seconds */
  periodicScanInterval: Scalars['Int']['output']
}

export type Subscription = {
  __typename?: 'Subscription'
  notification: Notification
}

/**
 * A group of media from the same album and the same day, that is grouped together in a timeline view
 * NOTE: It isn't used. Just copy from the old schema.graphql.
 */
export type TimelineGroup = {
  __typename?: 'TimelineGroup'
  /** The full album containing the media in this timeline group */
  album: Album
  /** The day shared for all media in this timeline group */
  date: Scalars['Time']['output']
  /** The media contained in this timeline group */
  media: Array<Media>
  /** The total amount of media in this timeline group */
  mediaTotal: Scalars['Int']['output']
}

export type User = {
  __typename?: 'User'
  /** Whether or not the user has admin privileges */
  admin: Scalars['Boolean']['output']
  /** All albums owned by this user */
  albums: Array<Album>
  id: Scalars['ID']['output']
  /** Top level albums owned by this user */
  rootAlbums: Array<Album>
  username: Scalars['String']['output']
}

/** Preferences for regular users */
export type UserPreferences = {
  __typename?: 'UserPreferences'
  id: Scalars['ID']['output']
  language?: Maybe<LanguageTranslation>
}

/** Metadata specific to video media */
export type VideoMetadata = {
  __typename?: 'VideoMetadata'
  audio?: Maybe<Scalars['String']['output']>
  bitrate?: Maybe<Scalars['String']['output']>
  codec?: Maybe<Scalars['String']['output']>
  colorProfile?: Maybe<Scalars['String']['output']>
  duration: Scalars['Float']['output']
  framerate?: Maybe<Scalars['Float']['output']>
  height: Scalars['Int']['output']
  id: Scalars['ID']['output']
  media: Media
  width: Scalars['Int']['output']
}
