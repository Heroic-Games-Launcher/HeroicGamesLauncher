import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { ChangelogModal } from '../../../ChangelogModal'
import './index.css'

type Release = {
  html_url: string
  name: string
  tag_name: string
  published_at: string
  type: 'stable' | 'beta'
  id: number
  body?: string
}

const storage = window.localStorage
const lastVersion = storage.getItem('last_version')?.replaceAll('"', '')

export default React.memo(function HeroicVersion() {
  const { t } = useTranslation()
  const [heroicVersion, setHeroicVersion] = useState('')
  const [newReleases, setNewReleases] = useState<Release[]>()
  const [showChangelogModal, setShowChangelogModal] = useState(true)
  const [showChangelogModalOnClick, setShowChangelogModalOnClick] =
    useState(false)

  const { hideChangelogsOnStartup, lastChangelogShown, setLastChangelogShown } =
    useContext(ContextProvider)

  useEffect(() => {
    window.api.getHeroicVersion().then((version) => {
      if (version !== lastVersion) {
        window.api.logInfo('Updated to a new version, cleaaning up the cache.')
        window.api.clearCache(false, true)
      }
      storage.setItem('last_version', JSON.stringify(version))
      setHeroicVersion(version)
    })
  }, [])

  useEffect(() => {
    window.api.getLatestReleases().then((releases) => setNewReleases(releases))
  }, [])

  const newStable: Release | undefined = newReleases?.filter(
    (r) => r.type === 'stable'
  )[0]
  const newBeta: Release | undefined = newReleases?.filter(
    (r) => r.type === 'beta'
  )[0]
  const shouldShowUpdates = newBeta || newStable

  const version = heroicVersion

  return (
    <>
      {((showChangelogModal &&
        !hideChangelogsOnStartup &&
        heroicVersion !== lastChangelogShown) ||
        showChangelogModalOnClick) && (
        <ChangelogModal
          dimissVersionCheck
          onClose={() => {
            setShowChangelogModal(false)
            setShowChangelogModalOnClick(false)
            setLastChangelogShown(heroicVersion)
          }}
        />
      )}
      <span
        className="heroicVersion"
        role="link"
        title={t(
          'info.heroic.click-to-see-changelog',
          'Click to see changelog'
        )}
        onClick={() => setShowChangelogModalOnClick((current) => !current)}
      >
        <span className="heroicVersion__title">
          <span>{t('info.heroic.version', 'Heroic Version')}: </span>
        </span>
        <strong>{version}</strong>
      </span>
      {shouldShowUpdates && (
        <div className="heroicNewReleases">
          <span>{t('info.heroic.newReleases', 'Update Available!')}</span>
          {newStable && (
            <a
              title={newStable.tag_name}
              onClick={() => window.api.openExternalUrl(newStable.html_url)}
            >
              {t('info.heroic.stable', 'Stable')} ({newStable.tag_name})
            </a>
          )}
          {newBeta && (
            <a
              title={newBeta.tag_name}
              onClick={() => window.api.openExternalUrl(newBeta.html_url)}
            >
              {t('info.heroic.beta', 'Beta')} ({newBeta.tag_name})
            </a>
          )}
        </div>
      )}
    </>
  )
})
