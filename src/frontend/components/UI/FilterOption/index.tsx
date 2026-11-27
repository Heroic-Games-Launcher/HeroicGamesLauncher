import { KeyboardEvent, ReactNode } from 'react'
import classNames from 'classnames'
import Checkbox from '../Checkbox'
import './index.css'

interface FilterOptionListProps {
  children: ReactNode
  className?: string
}

export function FilterOptionList({
  children,
  className
}: FilterOptionListProps) {
  return (
    <ul className={classNames('FilterOptionList', className)}>{children}</ul>
  )
}

interface FilterOptionProps {
  label: string
  checked: boolean
  onChange: () => void
  onOnly?: () => void
  onlyLabel?: string
}

export default function FilterOption({
  label,
  checked,
  onChange,
  onOnly,
  onlyLabel
}: FilterOptionProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLLabelElement>) => {
    const isNativeToggle =
      event.key === ' ' && (event.target as HTMLElement).tagName === 'INPUT'
    if ((event.key === 'Enter' || event.key === ' ') && !isNativeToggle) {
      event.preventDefault()
      onChange()
    }
  }

  return (
    <li className="FilterOption">
      <label className="FilterOption__label" onKeyDown={handleKeyDown}>
        <Checkbox size="small" checked={checked} onChange={onChange} />
        <span className="FilterOption__name">{label}</span>
      </label>
      {onOnly && onlyLabel && (
        <button
          type="button"
          className="FilterOption__only"
          aria-label={`${onlyLabel}: ${label}`}
          onClick={onOnly}
        >
          {onlyLabel}
        </button>
      )}
    </li>
  )
}
