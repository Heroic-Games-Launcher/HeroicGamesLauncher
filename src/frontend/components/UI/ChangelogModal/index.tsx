import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader } from '../Dialog'
import ReactMarkdown from 'react-markdown'
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
      <Dialog onClose={onClose} showCloseButton={true}>
        <DialogHeader onClose={onClose}>
          <div>{currentChangelog.name}</div>
        </DialogHeader>
        <DialogContent>
          <div className={classNames('changelogModalContent')}>
            {currentChangelog.body && (
              <ReactMarkdown
                className="changelogModalContent"
                linkTarget={'_blank'}
              >
                {currentChangelog.body}
              </ReactMarkdown>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
