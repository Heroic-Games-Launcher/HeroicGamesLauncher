import React, { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export const DialogFooter: React.FC<Props> = ({ children }: Props) => {
  return <div className="Dialog__footer">{children}</div>
}
