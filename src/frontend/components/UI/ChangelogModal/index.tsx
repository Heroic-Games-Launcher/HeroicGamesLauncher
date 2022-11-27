import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader } from '../Dialog'
import ReactMarkdown from 'react-markdown'
import classNames from 'classnames'
import { Release } from '../../../../common/types'

type Props = {
  onClose: () => void
}

export function ChangelogModal({ onClose }: Props) {
  const [currentChangelog, setCurrentChangelog] = useState<Release | null>(null)

  useEffect(() => {
    if (!currentChangelog) {
      window.api
        .getCurrentChangelog()
        .then((release) => setCurrentChangelog(release))
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
              <ReactMarkdown>{currentChangelog.body}</ReactMarkdown>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
