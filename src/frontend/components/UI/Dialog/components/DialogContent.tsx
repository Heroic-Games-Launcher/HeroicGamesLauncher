import React, { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

export const DialogContent: React.FC<Props> = ({
  children,
  className
}: Props) => {
  return <div className={className}>{children}</div>
}
