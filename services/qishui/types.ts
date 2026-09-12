/**
 * Playlist item, format: [song title, artist/album information]
 */
export type PlaylistItem = [string, string]

/**
 * Playlist data, two-dimensional array
 */
export type Playlist = PlaylistItem[]

/**
 * Artist object embedded in Qishui track/video entities
 */
export interface QishuiArtist {
  /** Artist display name */
  name?: string | null
  /** Simplified display name used by some entities */
  simple_display_name?: string | null
  /** Linked user profile for some video artists */
  user_info?: {
    /** User nickname used when artist name is missing */
    nickname?: string | null
  }
}

/**
 * Track entity from Qishui playlist medias
 */
export interface QishuiTrack {
  /** Track title */
  name?: string
  /** Album metadata */
  album?: {
    /** Album name */
    name?: string
  }
  /** Performing artists */
  artists?: QishuiArtist[]
}

/**
 * Video entity from Qishui playlist medias
 */
export interface QishuiVideo {
  /** Video title */
  title?: string
  /** Performing artists */
  artists?: QishuiArtist[]
}

/**
 * Single media entry in a Qishui playlist
 */
export interface QishuiMedia {
  /** Media type discriminator */
  type?: string
  /** Typed payload for track or video media */
  entity?: {
    /** Track payload when type is track */
    track?: QishuiTrack
    /** Video payload when type is video */
    video?: QishuiVideo
  }
}

/**
 * Modern.js router payload embedded in Qishui share pages
 */
export interface QishuiRouterData {
  /** Loader payloads keyed by route id */
  loaderData?: {
    /** Playlist page loader result */
    playlist_page?: {
      /** Ordered media list for the playlist */
      medias?: QishuiMedia[]
    }
  }
}
