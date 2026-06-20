import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import sanitizeHtml from 'sanitize-html'
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

  const sanitizedChangeLog = useMemo(() => {
    if (!changelog) return null
    const sanitized = sanitizeHtml(changelog, {
      disallowedTagsMode: 'discard'
    })
    return { __html: sanitized }
  }, [changelog])

  return (
    <Dialog showCloseButton onClose={backdropClick}>
      <DialogHeader onClose={backdropClick}>
        {t('game.changelogFor', 'Changelog for {{gameTitle}}', {
          gameTitle: title
        })}
      </DialogHeader>
      <DialogContent className="changelogModalContent">
        {sanitizedChangeLog ? (
          <div
            dangerouslySetInnerHTML={sanitizedChangeLog}
            className={'gameChangeLog'}
          />
        ) : (
          t('game.changelogNotFound', 'No changelog found')
        )}
      </DialogContent>
    </Dialog>
  )
}
