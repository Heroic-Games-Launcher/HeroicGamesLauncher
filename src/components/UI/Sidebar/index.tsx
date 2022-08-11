import classNames from 'classnames'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSquareCaretLeft,
  faSquareCaretRight
} from '@fortawesome/free-solid-svg-icons'
import ContextProvider from 'src/state/ContextProvider'
import CurrentDownload from './components/CurrentDownload'
import SidebarLinks from './components/SidebarLinks'
import './index.css'
import HeroicVersion from './components/HeroicVersion'

export default function Sidebar() {
  const { t } = useTranslation()
  const { libraryStatus, sidebarCollapsed, setSideBarCollapsed } =
    useContext(ContextProvider)
  const downloading = libraryStatus.filter(
    (g) => g.status === 'installing' || g.status === 'updating'
  )

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
      <HeroicVersion />
      <button
        className="collapseIcon"
        onClick={() => setSideBarCollapsed(!sidebarCollapsed)}
      >
        <FontAwesomeIcon
          icon={sidebarCollapsed ? faSquareCaretRight : faSquareCaretLeft}
          title={
            sidebarCollapsed
              ? t('sidebar.uncollapse', 'Uncollapse sidebar')
              : t('sidebar.collapse', 'Collapse sidebar')
          }
        />
      </button>
    </aside>
  )
}
