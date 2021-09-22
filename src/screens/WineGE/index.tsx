import './index.css';

import Header from 'src/components/UI/Header'
import { WineGEReleaseData } from 'src/types'

import React, { lazy, useState } from 'react';
import {
  IpcRenderer
} from 'electron'

const WineGECard = lazy(() => import('src/screens/WineGE/components/WineGECard'))

const { ipcRenderer } = window.require('electron') as {
    ipcRenderer: IpcRenderer
  }

export default function WineGE(): JSX.Element | null {
  const [wine_releases, setWineGEReleases] = useState([]);

  function refreshWineGeReleases() {
    return async () => {
      const new_releases = await ipcRenderer.invoke('refreshWineGE')
      console.log(new_releases)
      setWineGEReleases(new_releases)
    }
  }

  return (
    <>
      <Header goTo={'/'} renderBackButton title={'WineGE'} />
      <div className="WineGE">
        <button
          className="button is-primary"
          onClick={refreshWineGeReleases()}>
              Refresh
        </button>
        <div
          style={!wine_releases.length ? { backgroundColor: 'transparent' } : {}}
          className="gameListLayout"
        >
          {!!wine_releases.length && wine_releases.map((release: WineGEReleaseData, key) => (
            <WineGECard
              key={key}
              version={release.version}
              date={release.date}
              size={release.size}
              download={release.download}
              checksum={release.checksum}
            />
          ))}
        </div>
      </div>
    </>
  )
}