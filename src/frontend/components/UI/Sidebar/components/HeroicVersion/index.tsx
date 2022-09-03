import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'

type Release = {
  html_url: string
  name: string
  tag_name: string
  published_at: string
  type: 'stable' | 'beta'
  id: number
}

export default function HeroicVersion() {
  const { t } = useTranslation()
  const [heroicVersion, setHeroicVersion] = useState('')
  const [newReleases, setNewReleases] = useState<Release[]>()
  const { sidebarCollapsed } = useContext(ContextProvider)

  useEffect(() => {
    window.api.getHeroicVersion().then((version) => setHeroicVersion(version))
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
  const shouldShowUpdates = !sidebarCollapsed && (newBeta || newStable)

  const version = sidebarCollapsed
    ? heroicVersion.replace('-beta', 'b')
    : heroicVersion

  return (
    <>
      <div className="heroicVersion">
        {!sidebarCollapsed && (
          <span>
            <span>{t('info.heroic.version', 'Heroic Version')}: </span>
          </span>
        )}
        <strong>{version}</strong>
      </div>
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
}
