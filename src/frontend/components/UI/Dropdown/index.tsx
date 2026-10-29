import { FocusEvent, ReactNode, useEffect, useRef, useState } from 'react'
import './index.scss'

const CLOSE_DELAY_MS = 350

type Props = {
  title?: ReactNode | string
  children: ReactNode
  className?: string
  buttonClass?: string
  popUpOnHover?: boolean
}

export default function Dropdown({
  title,
  children,
  className,
  buttonClass,
  popUpOnHover = false
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const closeTimeout = useRef<ReturnType<typeof setTimeout>>()

  const cancelScheduledClose = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current)
      closeTimeout.current = undefined
    }
  }

  useEffect(() => cancelScheduledClose, [])

  const handlePopup = (state: 'enter' | 'leave') => {
    // if no pop up behavior is wanted, ignore mouse movements
    if (!popUpOnHover) return

    cancelScheduledClose()

    if (state === 'enter') {
      setIsExpanded(true)
      return
    }

    closeTimeout.current = setTimeout(
      () => setIsExpanded(false),
      CLOSE_DELAY_MS
    )
  }

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return
    cancelScheduledClose()
    setIsExpanded(false)
  }

  return (
    <div className={`dropdownContainer ${className || ''}`}>
      <button
        onMouseEnter={() => handlePopup('enter')}
        onMouseLeave={() => handlePopup('leave')}
        className={`dropdownButton ${buttonClass ? buttonClass : ''}`}
        onClick={() => {
          // focus first component when expanding
          if (!isExpanded) {
            window.api.gamepadAction({ action: 'tab' })
          }

          cancelScheduledClose()
          setIsExpanded(true)
        }}
      >
        {title}
      </button>
      <div
        onMouseEnter={() => handlePopup('enter')}
        onMouseLeave={() => handlePopup('leave')}
        onBlur={handleBlur}
        onFocus={() => {
          cancelScheduledClose()
          setIsExpanded(true)
        }}
        className={`dropdown ${isExpanded ? 'expanded' : 'collapsed'}`}
      >
        {children}
      </div>
    </div>
  )
}
