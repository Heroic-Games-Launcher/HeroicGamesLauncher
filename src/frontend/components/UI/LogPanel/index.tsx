import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDownToLine, ArrowUpToLine } from 'lucide-react'
import classNames from 'classnames'
import Button from '../Button'
import Icon from '../Icon'
import './index.css'

interface LogPanelProps {
  content: string
  maxLines?: number
  className?: string
}

function lineTone(line: string): 'error' | 'warning' | 'info' {
  const lower = line.toLowerCase()
  if (lower.includes(' err')) return 'error'
  if (lower.includes(' warn')) return 'warning'
  return 'info'
}

export default function LogPanel({
  content,
  maxLines = 1000,
  className
}: LogPanelProps) {
  const { t } = useTranslation()
  const boxRef = useRef<HTMLDivElement>(null)
  const [atEnd, setAtEnd] = useState(false)
  const [scrollable, setScrollable] = useState(false)

  let truncated = false
  let lines = content.split('\n')
  if (lines.length > maxLines) {
    lines = ['...', ...lines.slice(-maxLines)]
    truncated = true
  }

  const syncScrollState = () => {
    const box = boxRef.current
    if (!box) return
    const overflow = box.scrollHeight - box.clientHeight
    setScrollable(overflow > 8)
    setAtEnd(box.scrollTop >= overflow - 8)
  }

  useEffect(syncScrollState, [content])

  const jump = () => {
    const box = boxRef.current
    if (!box) return
    box.scrollTo({
      top: atEnd ? 0 : box.scrollHeight,
      behavior: 'smooth'
    })
  }

  const jumpLabel = atEnd
    ? t('setting.log.jump-to-start', 'Jump to the start of the log')
    : t('setting.log.jump-to-end', 'Jump to the end of the log')

  return (
    <div className={classNames('LogPanel', className)}>
      {truncated && (
        <span className="LogPanel__hint">
          {t(
            'settings.log.long-log-hint',
            'Log truncated, last 1000 lines are shown!'
          )}
        </span>
      )}
      <div className="LogPanel__wrapper">
        {scrollable && (
          <Button
            className="LogPanel__jump"
            variant="secondary"
            size="sm"
            icon={
              <Icon glyph={atEnd ? ArrowUpToLine : ArrowDownToLine} size="sm" />
            }
            onClick={jump}
            title={jumpLabel}
            aria-label={jumpLabel}
          />
        )}
        <div className="LogPanel__box" ref={boxRef} onScroll={syncScrollState}>
          {lines.map((line, key) => (
            <p key={key} className={`LogPanel__line is-${lineTone(line)}`}>
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
