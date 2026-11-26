import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react'
import classNames from 'classnames'
import './index.css'

export type { ButtonVariant } from 'common/types'
import type { ButtonVariant } from 'common/types'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    icon,
    fullWidth = false,
    type = 'button',
    className,
    ...buttonProps
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classNames(
        'Button',
        `Button--${variant}`,
        `Button--${size}`,
        className,
        {
          'Button--fullWidth': fullWidth,
          'Button--iconOnly': !children
        }
      )}
      {...buttonProps}
    >
      {icon}
      {children ? <span className="Button__label">{children}</span> : null}
    </button>
  )
})

export default Button
