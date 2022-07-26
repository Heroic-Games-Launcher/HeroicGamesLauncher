import React, { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export const DialogContent: React.FC<Props> = ({ children }: Props) => {
  return <div className="Dialog__content">{children}</div>
}
