import { ReactNode, useState } from 'react'
import './index.scss'

type Props = {
  title?: ReactNode | string
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
        className={`dropdownButton ${buttonClass ? buttonClass : ''}`}
        onClick={() => {
          // focus first component when expanding
          if (!isExpanded) {
            window.api.gamepadAction({ action: 'tab' })
          }

          // we'll focus both on click
          setIsExpanded(true)
        }}
      >
        {title}
      </button>
      <div
        // comment the line below if you want to test inner container CSS
        onBlur={() => setIsExpanded(false)}
        onFocus={() => setIsExpanded(true)}
        className={`dropdown ${isExpanded ? 'expanded' : 'collapsed'}`}
      >
        {children}
      </div>
    </div>
  )
}
