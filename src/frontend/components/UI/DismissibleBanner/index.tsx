import './index.css'
import { ReactNode, useState } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import Icon from '../Icon'

type BannerVariant = 'info' | 'accent' | 'success' | 'warning' | 'error'

const GLYPHS: Record<BannerVariant, LucideIcon> = {
  info: Info,
  accent: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert
}

interface Props {
  storageKey: string
  children: ReactNode
  title?: string
  variant?: BannerVariant
  className?: string
}

export default function DismissibleBanner({
  storageKey,
  children,
  title,
  variant = 'warning',
  className
}: Props) {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(storageKey) === 'true'
  )

  if (dismissed) return null

  const close = () => {
    localStorage.setItem(storageKey, 'true')
    setDismissed(true)
  }

  return (
    <div
      className={classNames(
        'DismissibleBanner',
        `DismissibleBanner--${variant}`,
        { 'DismissibleBanner--titleOnly': !title },
        className
      )}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <Icon
        className="DismissibleBanner__icon"
        glyph={GLYPHS[variant]}
        size="sm"
      />
      <div className="DismissibleBanner__body">
        <span className="DismissibleBanner__title">{title ?? children}</span>
        {title && (
          <span className="DismissibleBanner__message">{children}</span>
        )}
      </div>
      <button
        aria-label={t('button.close', 'Close')}
        className="DismissibleBanner__close"
        onClick={close}
        type="button"
      >
        <Icon glyph={X} size="sm" />
      </button>
    </div>
  )
}
