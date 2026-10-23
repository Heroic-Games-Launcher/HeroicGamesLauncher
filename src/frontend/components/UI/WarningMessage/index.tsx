import React from 'react'
import Alert from '../Alert'

interface Props {
  children: React.ReactNode
  className?: string
}

export default function WarningMessage({ children, className }: Props) {
  return (
    <Alert variant="warning" className={className}>
      {children}
    </Alert>
  )
}
