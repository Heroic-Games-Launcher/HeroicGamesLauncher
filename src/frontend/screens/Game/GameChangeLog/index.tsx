import { useMemo } from 'react'
import { Modal, ModalContent, ModalHeader } from 'frontend/components/UI/Modal'
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
    <Modal showCloseButton onClose={backdropClick}>
      <ModalHeader>
        {t('game.changelogFor', 'Changelog for {{gameTitle}}', {
          gameTitle: title
        })}
      </ModalHeader>
      <ModalContent className="changelogModalContent">
        <div
          dangerouslySetInnerHTML={santiziedChangeLog}
          className={'gameChangeLog'}
        />
      </ModalContent>
    </Modal>
  )
}
