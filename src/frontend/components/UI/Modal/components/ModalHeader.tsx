import React, { ReactNode } from 'react'
import classNames from 'classnames'

interface ModalHeaderProps {
  children: ReactNode
  className?: string
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  children,
  className
}) => (
  <header className={classNames('Modal__header', className)}>
    <h2 className="Modal__title">{children}</h2>
  </header>
)
