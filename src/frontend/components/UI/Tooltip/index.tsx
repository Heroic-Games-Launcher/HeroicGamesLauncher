import { ReactElement, ReactNode } from 'react'
import { Tooltip as MuiTooltip } from '@mui/material'
import './index.css'

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: ReactNode
  children: ReactElement
  placement?: TooltipPlacement
  /** Attach to the child directly. Only for children that take a ref, such as
   *  a plain DOM element; without it the child is wrapped in a span, which
   *  breaks layouts that select on direct children. */
  asChild?: boolean
}

export default function Tooltip({
  content,
  children,
  placement = 'top',
  asChild = false
}: TooltipProps) {
  return (
    <MuiTooltip
      title={<span className="Tooltip__content">{content}</span>}
      arrow
      placement={placement}
      enterTouchDelay={0}
      leaveTouchDelay={6000}
      classes={{ tooltip: 'Tooltip__popper' }}
    >
      {asChild ? children : <span className="Tooltip__anchor">{children}</span>}
    </MuiTooltip>
  )
}
