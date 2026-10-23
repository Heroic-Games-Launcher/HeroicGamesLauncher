import './index.css'
import React from 'react'
import classNames from 'classnames'
import { TriangleAlert } from 'lucide-react'
import Icon from '../Icon'

interface Props {
  children: React.ReactNode
  className?: string
}

export default function WarningMessage({ children, className }: Props) {
  return (
    <div className={classNames('WarningMessage', className)}>
      <Icon glyph={TriangleAlert} size="md" />
      <div>{children}</div>
    </div>
  )
}
