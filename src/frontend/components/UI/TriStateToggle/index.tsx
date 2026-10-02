import classNames from 'classnames'
import { useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'

export type CategoryFilterState = 'include' | 'exclude' | undefined

interface Props {
  htmlId: string
  handleChange: () => void
  value: CategoryFilterState
  title: string
  disabled?: boolean
  extraClass?: string
  description?: string
  fading?: boolean
}

export default function TriStateToggle(props: Props) {
  const {
    handleChange,
    value,
    disabled,
    title,
    htmlId,
    extraClass,
    description = '',
    fading
  } = props
  const { isRTL } = useContext(ContextProvider)

  return (
    <>
      <button
        id={htmlId}
        type="button"
        disabled={disabled}
        onClick={handleChange}
        aria-label={title}
        className="hiddenCheckbox"
      />
      <label
        className={classNames(`toggleSwitchWrapper Field ${extraClass || ''}`, {
          isRTL,
          fading,
          'is-included': value === 'include',
          'is-excluded': value === 'exclude'
        })}
        htmlFor={htmlId}
        title={description}
      >
        <span>{title}</span>
      </label>
    </>
  )
}
