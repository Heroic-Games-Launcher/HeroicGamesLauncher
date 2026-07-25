import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import { useTranslation } from 'react-i18next'
import { useAwaited } from 'frontend/hooks/useAwaited'
import type { GameHandle } from 'frontend/helpers/ipc'

interface GameChangeLogProps {
  game: GameHandle
  title: string
  backdropClick: () => void
}

export default function GameChangeLog({
  game,
  title,
  backdropClick
}: GameChangeLogProps) {
  const { t } = useTranslation('gamepage')
  const changelog = useAwaited(window.api.game.getChangelog, game)

  return (
    <Dialog showCloseButton onClose={backdropClick}>
      <DialogHeader onClose={backdropClick}>
        {t('game.changelogFor', 'Changelog for {{gameTitle}}', {
          gameTitle: title
        })}
      </DialogHeader>
      <DialogContent className="changelogModalContent">
        {changelog ? (
          <div
            dangerouslySetInnerHTML={{ __html: changelog }}
            className={'gameChangeLog'}
          />
        ) : (
          t('game.changelogNotFound', 'No changelog found')
        )}
      </DialogContent>
    </Dialog>
  )
}
