import { HTMLAttributes, ReactNode } from 'react'
import classNames from 'classnames'
import './index.css'

type PanelTone = 'translucent' | 'solid' | 'glass'
type PanelPadding = 'none' | 'sm' | 'md' | 'lg'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  tone?: PanelTone
  padding?: PanelPadding
}

export default function Panel({
  children,
  tone = 'translucent',
  padding = 'md',
  className,
  ...divProps
}: PanelProps) {
  return (
    <div
      className={classNames(
        'Panel',
        `Panel--${tone}`,
        `Panel--padding-${padding}`,
        className
      )}
      {...divProps}
    >
      {children}
    </div>
  )
}
