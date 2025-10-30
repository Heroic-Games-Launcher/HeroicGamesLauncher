import { ReactNode, useState } from 'react'
import './index.scss'

type Props = {
  title: ReactNode | string
  children: ReactNode
  className?: string
  buttonClass?: string
}

export default function Dropdown({
  title,
  children,
  className,
  buttonClass
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={`dropdownContainer ${className || ''}`}>
      <button
        className={`${buttonClass ? buttonClass : ''}`}
        onFocus={() => {
          // if we're focused here, but it's expanded, user has left
          // inner dropdown, close dropdown
          if (isExpanded) setIsExpanded(false)
        }}
        onClick={() => {
          // focus first component when expanding
          if (!isExpanded) {
            window.api.gamepadAction({ action: 'tab' })
          }

          setIsExpanded(!isExpanded)
        }}
      >
        {title}
      </button>
      <div
        onFocus={() => setIsExpanded(true)}
        className={`dropdown ${isExpanded ? 'expanded' : 'collapsed'}`}
      >
        {children}
      </div>
    </div>
  )
}
