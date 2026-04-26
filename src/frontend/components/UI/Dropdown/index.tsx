import { ReactNode, useContext, useState } from 'react'
import './index.scss'
import ContextProvider from 'frontend/state/ContextProvider'

type Props = {
  title?: ReactNode | string
  children: ReactNode
  containerClassName?: string
  buttonClass?: string
  dropdownClassName?: string
  popUpOnHover?: boolean
}

export default function Dropdown({
  title,
  children,
  containerClassName,
  buttonClass,
  dropdownClassName,
  popUpOnHover = false
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { activeController } = useContext(ContextProvider)

  const handlePopup = (state: 'enter' | 'leave') => {
    // if no pop up behavior is wanted, ignore mouse movements
    if (!popUpOnHover) return

    // popup behaviour is disabled for gamepads
    if (activeController) return

    setIsExpanded(state === 'enter')
  }

  return (
    <div className={`dropdownContainer ${containerClassName || ''}`}>
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
        className={`dropdown ${dropdownClassName || ''} ${isExpanded ? 'expanded' : 'collapsed'}`}
      >
        {children}
      </div>
    </div>
  )
}
