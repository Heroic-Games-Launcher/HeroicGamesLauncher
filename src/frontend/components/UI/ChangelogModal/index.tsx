import { useEffect, useState } from 'react'
import { Modal, ModalContent, ModalHeader } from '../Modal'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import classNames from 'classnames'
import { Release } from 'common/types'
import './index.scss'

type Props = {
  onClose: () => void
  dimissVersionCheck?: boolean
}

const storage = window.localStorage
const lastChangelog = storage.getItem('last_changelog')?.replaceAll('"', '')

export function ChangelogModal({ onClose, dimissVersionCheck }: Props) {
  const [currentChangelog, setCurrentChangelog] = useState<Release | null>(null)

  useEffect(() => {
    if (!currentChangelog) {
      window.api.getHeroicVersion().then((version) => {
        if (dimissVersionCheck || version !== lastChangelog) {
          window.api
            .getCurrentChangelog()
            .then((release) => setCurrentChangelog(release))
        }
      })
    }
  }, [])

  if (!currentChangelog) {
    return <></>
  }

  return (
    <div className={classNames('changelogModal')}>
      <Modal onClose={onClose} showCloseButton={true}>
        <ModalHeader>{currentChangelog.name}</ModalHeader>
        <ModalContent>
          <div className={classNames('changelogModalContent')}>
            {currentChangelog.body && (
              <ReactMarkdown
                className="changelogModalContent"
                linkTarget={'_blank'}
                rehypePlugins={[rehypeRaw]}
              >
                {currentChangelog.body}
              </ReactMarkdown>
            )}
          </div>
        </ModalContent>
      </Modal>
    </div>
  )
}
