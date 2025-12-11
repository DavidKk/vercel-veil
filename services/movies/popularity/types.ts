/**
 * Movie popularity/hot status levels
 */
export enum MovieHotStatus {
  /** Highly anticipated - movies not yet released with high popularity */
  HIGHLY_ANTICIPATED = 'highly_anticipated',
  /** Very hot - movies with high popularity and good ratings */
  VERY_HOT = 'very_hot',
  /** Average - movies with moderate popularity */
  AVERAGE = 'average',
  /** Niche - movies with low popularity */
  NICHE = 'niche',
}
