import classNames from 'classnames'
import {
  Ban,
  CircleMinus,
  Download,
  Play,
  RefreshCw,
  Square,
  X
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Button, { ButtonVariant } from '../Button'
import Icon from '../Icon'
import './index.css'

type GameAction =
  | 'play'
  | 'install'
  | 'update'
  | 'stop'
  | 'cancel'
  | 'queue'
  | 'unavailable'
  | 'busy'

type ActionStyle = {
  glyph: LucideIcon | null
  variant: ButtonVariant
  legacyClass: string
}

const ACTIONS: Record<GameAction, ActionStyle> = {
  play: { glyph: Play, variant: 'primary', legacyClass: 'playIcon' },
  install: { glyph: Download, variant: 'secondary', legacyClass: 'downIcon' },
  update: { glyph: RefreshCw, variant: 'ghost', legacyClass: 'updateIcon' },
  stop: { glyph: Square, variant: 'danger', legacyClass: 'cancelIcon' },
  cancel: { glyph: X, variant: 'danger', legacyClass: 'cancelIcon' },
  queue: { glyph: CircleMinus, variant: 'danger', legacyClass: 'queueIcon' },
  unavailable: {
    glyph: Ban,
    variant: 'ghost',
    legacyClass: 'notAvailableIcon'
  },
  busy: { glyph: null, variant: 'ghost', legacyClass: 'iconDisabled' }
}

interface GameActionButtonProps {
  action: GameAction
  label: string
  title?: string
  disabled?: boolean
  className?: string
  onClick?: () => void
}

export default function GameActionButton({
  action,
  label,
  title,
  disabled = false,
  className,
  onClick
}: GameActionButtonProps) {
  const { glyph, variant, legacyClass } = ACTIONS[action]

  return (
    <Button
      variant={variant}
      title={title ?? label}
      disabled={disabled || !onClick}
      onClick={onClick}
      className={classNames('GameActionButton', legacyClass, className)}
      icon={glyph ? <Icon glyph={glyph} size="xl" strokeWidth={2} /> : null}
    >
      {label}
    </Button>
  )
}
