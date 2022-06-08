import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ipcRenderer } from 'src/helpers'
import ContextProvider from 'src/state/ContextProvider'
import CurrentDownload from './components/CurrentDownload'
import SidebarLinks from './components/SidebarLinks'
import './index.css'

export default function Sidebar() {
  const [heroicVersion, setHeroicVersion] = useState('')
  const { t } = useTranslation()
  const { libraryStatus } = useContext(ContextProvider)
  const downloading = libraryStatus.filter(
    (g) => g.status === 'installing' || g.status === 'updating'
  )

  useEffect(() => {
    ipcRenderer
      .invoke('getHeroicVersion')
      .then((version) => setHeroicVersion(version))
  }, [])

  return (
    <aside className="Sidebar">
      <SidebarLinks />
      <div className="currentDownloads">
        {downloading.map((g) => (
          <CurrentDownload
            key={g.appName}
            appName={g.appName}
            runner={g.runner}
          />
        ))}
      </div>
      <div className="heroicVersion">
        <span>{t('info.heroic.version', 'Heroic Version')}: </span>
        <strong>{heroicVersion}</strong>
      </div>
    </aside>
  )
}
