import React, { useContext } from 'react'
import ContextProvider from 'src/state/ContextProvider'
import CurrentDownload from './components/CurrentDownload'
import SidebarLinks from './components/SidebarLinks'
import './index.css'

export default function Sidebar() {
  const { libraryStatus } = useContext(ContextProvider)
  const downloading = libraryStatus.filter(
    (g) => g.status === 'installing' || g.status === 'updating'
  )
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
    </aside>
  )
}
