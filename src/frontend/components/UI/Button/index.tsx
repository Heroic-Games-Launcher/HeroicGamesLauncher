import { ButtonHTMLAttributes, ReactNode } from 'react'
import classNames from 'classnames'
import './index.css'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  fullWidth?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  type = 'button',
  className,
  ...buttonProps
}: ButtonProps) {
  return (
    <button
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
}
