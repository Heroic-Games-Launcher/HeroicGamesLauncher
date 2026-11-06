import { ReactNode } from 'react'
import { Info } from 'lucide-react'
import classNames from 'classnames'
import { Tooltip } from '@mui/material'
import Icon from '../Icon'
import './index.css'

interface InfoTooltipProps {
  content: ReactNode
  label?: string
  className?: string
}

export default function InfoTooltip({
  content,
  label,
  className
}: InfoTooltipProps) {
  return (
    <Tooltip
      title={<span className="InfoTooltip__content">{content}</span>}
      arrow
      enterTouchDelay={0}
      leaveTouchDelay={6000}
      classes={{ tooltip: 'InfoTooltip__popper' }}
    >
      <span
        className={classNames('InfoTooltip', className)}
        tabIndex={0}
        role="note"
        aria-label={label}
      >
        <Icon glyph={Info} size="sm" />
      </span>
    </Tooltip>
  )
}
