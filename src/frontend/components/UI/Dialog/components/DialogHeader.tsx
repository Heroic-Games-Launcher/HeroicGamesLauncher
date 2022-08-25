import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { ReactNode } from 'react'

export interface DialogHeaderProps {
  onClose: () => void
  children: ReactNode
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({
  children,
  onClose
}) => {
  return (
    <div className="Dialog__header">
      <h1 className="Dialog__headerTitle">{children}</h1>
      <div className="Dialog__headerClose">
        <button className="Dialog__headerCloseButton" onClick={onClose}>
          <FontAwesomeIcon className="Dialog__headerCloseIcon" icon={faXmark} />
        </button>
      </div>
    </div>
  )
}
