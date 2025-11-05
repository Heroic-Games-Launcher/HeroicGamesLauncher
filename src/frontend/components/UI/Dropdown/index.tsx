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

          setIsExpanded(true)
        }}
      >
        {title}
      </button>
      <div
        onBlur={() => setIsExpanded(false)}
        onFocus={() => setIsExpanded(true)}
        className={`dropdown ${isExpanded ? 'expanded' : 'collapsed'}`}
      >
        {children}
      </div>
    </div>
  )
}
