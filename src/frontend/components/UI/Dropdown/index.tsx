import { ReactNode, useState } from 'react'
import './index.scss'

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

  const handlePopup = (state: 'enter' | 'leave') => {
    // if no pop up behavior is wanted, ignore mouse movements
    if (!popUpOnHover) return
    setIsExpanded(state === 'enter')
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

          setIsExpanded(true)
        }}
      >
        {title}
      </button>
      <div
        onMouseEnter={() => handlePopup('enter')}
        onMouseLeave={() => handlePopup('leave')}
        onBlur={() => setIsExpanded(false)}
        onFocus={() => setIsExpanded(true)}
        className={`dropdown ${isExpanded ? 'expanded' : 'collapsed'}`}
      >
        {children}
      </div>
    </div>
  )
}
