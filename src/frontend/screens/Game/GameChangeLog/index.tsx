import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import { useTranslation } from 'react-i18next'

interface GameChangeLogProps {
  title: string
  changelog: string
  backdropClick: () => void
}

export default function GameChangeLog({
  title,
  changelog,
  backdropClick
}: GameChangeLogProps) {
  const { t } = useTranslation('gamepage')
  const [sanitizedChangelog, setSanitizedChangelog] = useState<{
    __html: string
  } | null>(null)

  useEffect(() => {
    void window.api
      .sanitizeHtml(changelog)
      .then((output) => setSanitizedChangelog({ __html: output }))
  }, [changelog])

  if (!sanitizedChangelog) return <></>

  return (
    <Dialog showCloseButton onClose={backdropClick}>
      <DialogHeader onClose={backdropClick}>
        {t('game.changelogFor', 'Changelog for {{gameTitle}}', {
          gameTitle: title
        })}
      </DialogHeader>
      <DialogContent className="changelogModalContent">
        <div
          dangerouslySetInnerHTML={sanitizedChangelog}
          className={'gameChangeLog'}
        />
      </DialogContent>
    </Dialog>
  )
}
