/**
 * 猫眼电影 API 类型定义
 */

/** 最受好评电影列表响应 */
export interface TopRatedMoviesResponse {
  title: string
  movieList: MovieListItem[]
}

/** 最受好评电影项 */
export interface MovieListItem {
  movieId: number
  poster: string
  score: string
  name: string
}

/** 最受期待电影列表响应 */
export interface MostExpectedResponse {
  coming: ComingMovie[]
  paging: Paging
}

/** 最受期待电影项 */
export interface ComingMovie {
  id: number
  img: string
  wish: number
  wishst: number
  nm: string
  comingTitle: string
}

/** 分页信息 */
export interface Paging {
  hasMore: boolean
  limit: number
  offset: number
  total: number
}

/** 合并后的电影数据 */
export interface MergedMovie {
  // 猫眼数据
  maoyanId: number | string
  name: string
  poster: string
  score?: string
  wish?: number
  source: 'topRated' | 'mostExpected' | 'tmdbPopular' | 'tmdbUpcoming'
  sources: ('topRated' | 'mostExpected' | 'tmdbPopular' | 'tmdbUpcoming')[] // 可能同时出现在多个列表中
  maoyanUrl?: string // 猫眼电影详情页URL

  // TMDB 数据（通过搜索获取）
  tmdbId?: number
  tmdbPoster?: string
  overview?: string
  releaseDate?: string
  year?: number
  rating?: number
  tmdbUrl?: string
  genres?: string[] // 电影类型（如：动作、喜剧、剧情等）
}
