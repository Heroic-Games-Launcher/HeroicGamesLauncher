import React, { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

export const DialogContent: React.FC<Props> = ({
  children,
  className
}: Props) => {
  return <div className={`Dialog__content ${className}`}>{children}</div>
}
