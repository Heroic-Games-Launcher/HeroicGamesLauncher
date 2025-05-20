import React, { ReactNode } from 'react'
import { DialogTitle } from '@mui/material'

interface DialogHeaderProps {
  onClose?: () => void
  children: ReactNode
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children }) => {
  return (
    <DialogTitle
      sx={{
        fontFamily: 'var(--primary-font-family)',
        fontSize: 'var(--text-xl)',
        fontWeight: 'var(--bold)',
        paddingLeft: 0
      }}
    >
      {children}
    </DialogTitle>
  )
}
