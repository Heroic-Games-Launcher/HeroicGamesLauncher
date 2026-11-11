import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import { Modal, ModalContent, ModalHeader } from '../Modal'
import Icon from '../Icon'
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

function enhanceChangelog(body: string): string {
  const withMentions = body.replace(
    /(^|[\s(])@([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?)/g,
    '$1<span class="changelogMention">@$2</span>'
  )
  return withMentions.replace(
    /(?<![\]("'=>])https?:\/\/[^\s<>()]+/g,
    (url) =>
      `<a href="${url}" target="_blank" rel="noreferrer" class="changelogLink">${url}</a>`
  )
}

export function ChangelogModal({ onClose, dimissVersionCheck }: Props) {
  const { t } = useTranslation()
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
                {enhanceChangelog(currentChangelog.body)}
              </ReactMarkdown>
            )}
          </div>
          {currentChangelog.html_url && (
            <a
              className="changelogModalFullLink"
              href={currentChangelog.html_url}
              target="_blank"
              rel="noreferrer"
            >
              {t('changelog.view_full', 'View full changelog on GitHub')}
              <Icon glyph={ExternalLink} size="sm" />
            </a>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
