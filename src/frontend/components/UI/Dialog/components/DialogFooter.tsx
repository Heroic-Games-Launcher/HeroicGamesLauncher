import React, { ReactNode } from 'react'

interface Props {
  className?: string
  children: ReactNode
}

export const DialogFooter: React.FC<Props> = ({
  className,
  children
}: Props) => {
  return <div className={`Dialog__footer ${className ?? ''}`}>{children}</div>
}
