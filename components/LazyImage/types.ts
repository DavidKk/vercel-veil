import type { SVGProps } from 'react'

/**
 * Props for PosterPlaceholder component
 */
export interface PosterPlaceholderProps extends SVGProps<SVGSVGElement> {
  /**
   * Custom text to display instead of default "Poster Unavailable"
   */
  title?: string
  /**
   * Custom subtitle text
   */
  subtitle?: string
}
