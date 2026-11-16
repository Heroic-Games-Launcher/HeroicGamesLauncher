import React, { ReactNode } from 'react'
import classNames from 'classnames'

interface ModalContentProps {
  children: ReactNode
  className?: string
}

export const ModalContent: React.FC<ModalContentProps> = ({
  children,
  className
}) => <div className={classNames('Modal__content', className)}>{children}</div>
