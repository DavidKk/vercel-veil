export interface SubsonicSong {
  id: string
  title: string
  artist: string
  album: string
  coverArt?: string
  track?: number
  year?: number
  duration?: number // seconds
  bitRate?: number // kbps
  path?: string
}

export interface SearchResult3 {
  song: SubsonicSong[]
}

export interface MusicDirectory {
  id: string
  name: string
  song: SubsonicSong[]
}

export interface SubsonicResponse {
  status: 'ok' | 'failed'
  version: string
  type?: string
  serverVersion?: string
  openSubsonic?: boolean
  searchResult3?: SearchResult3
  musicDirectory?: MusicDirectory
  error?: {
    code: number
    message: string
  }
}

export interface NavidromeResponse {
  'subsonic-response': SubsonicResponse
}

export function isNavidromeResponse(data: any): data is NavidromeResponse {
  if (!('subsonic-response' in data)) {
    return false
  }

  const response = data['subsonic-response']
  return response && typeof response === 'object' && 'status' in response && 'version' in response
}
