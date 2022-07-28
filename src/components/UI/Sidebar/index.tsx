import classNames from 'classnames'
import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSquareCaretLeft,
  faSquareCaretRight
} from '@fortawesome/free-solid-svg-icons'
import { ipcRenderer } from 'src/helpers'
import ContextProvider from 'src/state/ContextProvider'
import CurrentDownload from './components/CurrentDownload'
import SidebarLinks from './components/SidebarLinks'
import './index.css'

export default function Sidebar() {
  const [heroicVersion, setHeroicVersion] = useState('')
  const { t } = useTranslation()
  const { libraryStatus, sidebarCollapsed, setSideBarCollapsed } =
    useContext(ContextProvider)
  const downloading = libraryStatus.filter(
    (g) => g.status === 'installing' || g.status === 'updating'
  )

  useEffect(() => {
    ipcRenderer
      .invoke('getHeroicVersion')
      .then((version) => setHeroicVersion(version))
  }, [])

  const version = sidebarCollapsed
    ? heroicVersion.replace('-beta', 'b')
    : heroicVersion

  return (
    <aside className={classNames('Sidebar', { collapsed: sidebarCollapsed })}>
      <SidebarLinks />
      <div className="currentDownloads">
        {downloading.map((g) => (
          <CurrentDownload
            key={g.appName}
            appName={g.appName}
            runner={g.runner || 'legendary'}
          />
        ))}
      </div>
      <div className="heroicVersion">
        {!sidebarCollapsed && (
          <span>{t('info.heroic.version', 'Heroic Version')}: </span>
        )}
        <strong>{version}</strong>
      </div>
      <span className="collapseIcon">
        <FontAwesomeIcon
          icon={sidebarCollapsed ? faSquareCaretRight : faSquareCaretLeft}
          title={
            sidebarCollapsed
              ? t('sidebar.uncollapse', 'Uncollapse sidebar')
              : t('sidebar.collapse', 'Collapse sidebar')
          }
          onClick={() => setSideBarCollapsed(!sidebarCollapsed)}
        />
      </span>
    </aside>
  )
}
