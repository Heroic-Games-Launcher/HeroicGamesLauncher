import { ReactNode, useEffect, useRef, useState } from 'react'
import './index.scss'

type Props = {
  title?: ReactNode | string
  children: ReactNode
  className?: string
  buttonClass?: string
  dataTour?: string
}

export default function Dropdown({
  title,
  children,
  className,
  buttonClass,
  dataTour
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isExpanded) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsExpanded(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isExpanded])

  return (
    <div ref={containerRef} className={`dropdownContainer ${className || ''}`}>
      <button
        className={`dropdownButton ${buttonClass ? buttonClass : ''}`}
        data-tour={dataTour}
        onClick={() => {
          // focus first component when expanding
          if (!isExpanded) {
            void window.api.gamepadAction({ action: 'tab' })
          }

          setIsExpanded((expanded) => !expanded)
        }}
      >
        {title}
      </button>
      <div className={`dropdown ${isExpanded ? 'expanded' : 'collapsed'}`}>
        {children}
      </div>
    </div>
  )
}
