import React, { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import sanitizeHtml from 'sanitize-html'
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
  const santiziedChangeLog = useMemo(() => {
    const sanitized = sanitizeHtml(changelog, {
      disallowedTagsMode: 'discard'
    })
    return { __html: sanitized }
  }, [changelog])

  return (
    <Dialog showCloseButton onClose={backdropClick}>
      <DialogHeader onClose={backdropClick}>
        {t('game.changelogFor', 'Changelog for {{title}}', { title })}
      </DialogHeader>
      <DialogContent>
        <div
          dangerouslySetInnerHTML={santiziedChangeLog}
          className={'gameChangeLog'}
        />
      </DialogContent>
    </Dialog>
  )
}
