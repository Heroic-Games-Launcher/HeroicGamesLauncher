import { ReactElement, ReactNode } from 'react'
import { Tooltip as MuiTooltip } from '@mui/material'
import './index.css'

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: ReactNode
  children: ReactElement
  placement?: TooltipPlacement
}

export default function Tooltip({
  content,
  children,
  placement = 'top'
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
      <span className="Tooltip__anchor">{children}</span>
    </MuiTooltip>
  )
}
