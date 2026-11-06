import { ReactNode } from 'react'
import classNames from 'classnames'
import './index.css'

interface FilterSectionProps {
  label?: string
  children: ReactNode
  className?: string
}

export default function FilterSection({
  label,
  children,
  className
}: FilterSectionProps) {
  return (
    <div className={classNames('FilterSection', className)}>
      {label ? <div className="FilterSection__label">{label}</div> : null}
      <div className="FilterSection__items">{children}</div>
    </div>
  )
}
