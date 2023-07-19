import React, { useEffect, useRef, useState } from 'react'
import './index.scss'

interface PopoverComponentProps {
  item: React.ReactElement
  children: React.ReactElement | React.ReactNode | React.ReactNode[]
}

const PopoverComponent: React.FC<PopoverComponentProps> = ({
  item,
  children
}) => {
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)

  const handleClick = () => {
    setOpen(!open)
  }

  useEffect(() => {
    if (open) {
      // add a click listener to close the popover when clicking outside
      const callback = (event: MouseEvent) => {
        if (!wrapper.current!.contains(event.target as HTMLElement)) {
          setOpen(false)
        }
      }

      document.addEventListener('click', callback)

      return () => {
        // remove the listener when the popover is closed
        document.removeEventListener('click', callback)
      }
    } else {
      return () => ''
    }
  }, [open])

  return (
    <div className="popover-wrapper" ref={wrapper}>
      {React.cloneElement(item, {
        onClick: handleClick,
        style: { cursor: 'pointer' }
      })}
      {open && (
        <div id={item.props.id} className="popover">
          {children}
        </div>
      )}
    </div>
  )
}

export default PopoverComponent
