import React, { ReactNode } from 'react'

export interface DialogHeaderProps {
  onClose: () => void
  children: ReactNode
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children }) => {
  return (
    <div className="Dialog__header">
      <h1 className="Dialog__headerTitle">{children}</h1>
    </div>
  )
}
