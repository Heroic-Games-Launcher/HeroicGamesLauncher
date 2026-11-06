import './index.css'
import { ReactNode, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '../Button'
import Icon from '../Icon'
import WarningMessage from '../WarningMessage'

interface Props {
  storageKey: string
  children: ReactNode
}

export default function DismissibleBanner({ storageKey, children }: Props) {
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
    <div className="DismissibleBanner">
      <WarningMessage>{children}</WarningMessage>
      <Button
        variant="ghost"
        size="sm"
        icon={<Icon glyph={X} size="xs" />}
        onClick={close}
        aria-label={t('button.close', 'Close')}
      />
    </div>
  )
}
