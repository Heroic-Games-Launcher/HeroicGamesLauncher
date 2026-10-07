import React, { ReactNode } from 'react'
import classNames from 'classnames'

type ModalFooterLayout = 'inline' | 'stacked'

interface ModalFooterProps {
  children: ReactNode
  layout?: ModalFooterLayout
  className?: string
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  layout = 'inline',
  className
}) => (
  <footer
    className={classNames(
      'Modal__footer',
      `Modal__footer--${layout}`,
      className
    )}
  >
    {children}
  </footer>
)
