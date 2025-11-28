export type Genre = string
export type MovieType = 'movie' | 'series'

export interface Overview {
  [key: string]: string
}

export interface Translation {
  [key: string]: string
}

export interface RemoteID {
  id: string
  type: number
  sourceName: string
}

export interface Movie {
  objectID: string
  country: string
  extended_title: string
  genres: Genre[]
  id: string
  image_url: string
  name: string
  overview: string
  primary_language: string
  primary_type: string
  status: string
  type: MovieType
  tvdb_id: string
  year: string
  slug: string
  overviews: Overview
  translations: Translation
  network: string
  remote_ids: RemoteID[]
  thumbnail: string
}
