import type { PosterPlaceholderProps } from './types'

const FONT_FAMILY = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial"
const VIEWBOX = '0 0 420 600'
const CENTER_X = 210

export default function PosterPlaceholder({ title = 'Poster Unavailable', subtitle = 'VEIL · Loading Failed', ...props }: PosterPlaceholderProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={VIEWBOX} role="img" {...props}>
      <defs>
        <linearGradient id="g1" x1={0} y1={0} x2={1} y2={1}>
          <stop offset="0%" stopColor="#eef2f7" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id="fold" x1={0} y1={0} x2={1} y2={1}>
          <stop offset="0%" stopColor="#f3f4f6" />
          <stop offset="100%" stopColor="#e5e7eb" />
        </linearGradient>
        <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feFlood floodColor="#000000" floodOpacity={0.6} result="flood" />
          <feComposite in="flood" in2="SourceAlpha" operator="in" result="mask" />
          <feGaussianBlur in="mask" stdDeviation={3} result="blur" />
          <feOffset dx={2} dy={2} result="offsetBlur" />
          <feComposite in="SourceGraphic" in2="offsetBlur" operator="arithmetic" k1={0} k2={1} k3={-1} k4={0} />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#g1)" />
      <path d="M0 190 C150 140 270 230 420 170 L420 600 L0 600 Z" fill="#f3f4f6" opacity={0.85} />
      <g transform="translate(135,120)">
        <path d="M0 0 H120 Q150 20 135 50 L150 50 V260 H0 Z" fill="#ffffff" />
        <path d="M120 0 Q150 20 135 50 L150 50 Q150 15 120 0 Z" fill="url(#fold)" opacity={0.95} />
        <g transform="translate(75,125) rotate(45)" fill="#9ca3af" filter="url(#innerShadow)">
          <polygon points="0,-60 12,0 0,60 -12,0" />
          <polygon points="-60,0 0,12 60,0 0,-12" />
        </g>
      </g>
      <text x={CENTER_X} y={430} textAnchor="middle" fill="#111827" fontSize={22} fontFamily={FONT_FAMILY}>
        {title}
      </text>
      <text x={CENTER_X} y={460} textAnchor="middle" fill="#6b7280" fontSize={13} fontFamily={FONT_FAMILY}>
        {subtitle}
      </text>
    </svg>
  )
}
