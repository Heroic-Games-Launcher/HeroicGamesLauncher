import { SVGProps } from 'react'

type Props = Omit<SVGProps<SVGSVGElement>, 'stroke' | 'fill'> & {
  size?: number
  strokeWidth?: number
}

const base = (size: number, strokeWidth: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
})

export function DiscordOutline({
  size = 20,
  strokeWidth = 1.75,
  ...rest
}: Props) {
  return (
    <svg {...base(size, strokeWidth)} {...rest}>
      {/* Outlined interpretation of the Discord mark */}
      <path d="M7.5 5.5h9a2.5 2.5 0 0 1 2.5 2.5v7.5a2.5 2.5 0 0 1-2.5 2.5H14l-1 1.5H11l-1-1.5H7.5A2.5 2.5 0 0 1 5 15.5V8a2.5 2.5 0 0 1 2.5-2.5z" />
      <path d="M8.5 8.5q3.5-1.5 7 0" />
      <path d="M8.5 15.5q3.5 1.5 7 0" />
      <circle cx="9.5" cy="12" r="1.1" />
      <circle cx="14.5" cy="12" r="1.1" />
    </svg>
  )
}

export function PatreonOutline({
  size = 20,
  strokeWidth = 1.75,
  ...rest
}: Props) {
  return (
    <svg {...base(size, strokeWidth)} {...rest}>
      {/* Outlined interpretation of the Patreon mark: bar + circle */}
      <line x1="5.5" y1="4.5" x2="5.5" y2="19.5" />
      <circle cx="15" cy="10" r="5.5" />
    </svg>
  )
}
