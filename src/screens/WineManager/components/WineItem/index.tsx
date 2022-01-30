import './index.css'

import React, { useContext, useState } from 'react'

import { WineVersionInfo } from 'src/types'
import { ReactComponent as DownIcon } from 'src/assets/down-icon.svg'
import { ReactComponent as StopIcon } from 'src/assets/stop-icon.svg'
import { SvgButton } from 'src/components/UI'
import FolderOpen from '@mui/icons-material/FolderOpen'
import ContextProvider from 'src/state/ContextProvider'
import { useTranslation } from 'react-i18next'
import { ProgressInfo, State } from 'heroic-wine-downloader'
import prettyBytes from 'pretty-bytes'

const { ipcRenderer } = window.require('electron')

const WineItem = ({
  version,
  date,
  downsize,
  disksize,
  download,
  checksum,
  isInstalled,
  hasUpdate,
  installDir,
  type
}: WineVersionInfo) => {
  const { t } = useTranslation()
  const { refreshWineVersionInfo } = useContext(ContextProvider)
  const [progress, setProgress] = useState<{
    state: State
    progress: ProgressInfo
  }>({ state: 'idle', progress: { percentage: 0, avgSpeed: 0, eta: Infinity } })

  ipcRenderer.on('progressOf' + version, (e, progress) => {
    setProgress(progress)
  })

  if (!version || !downsize || type === 'proton') {
    return null
  }

  const isDownloading = progress.state === 'downloading'
  const unZipping = progress.state === 'unzipping'

  async function install() {
    ipcRenderer
      .invoke('installWineVersion', {
        version,
        date,
        downsize,
        disksize,
        download,
        checksum,
        isInstalled,
        hasUpdate,
        type
      })
      .then((response) => {
        if (response === 'success') {
          refreshWineVersionInfo(false)
        }
      })
  }

  async function remove() {
    ipcRenderer
      .invoke('removeWineVersion', {
        version,
        date,
        downsize,
        disksize,
        download,
        checksum,
        isInstalled,
        hasUpdate,
        installDir
      })
      .then((response) => {
        if (response) {
          refreshWineVersionInfo(false)
        }
      })
  }

  function openInstallDir() {
    ipcRenderer.send('showItemInFolder', installDir)
  }

  const renderStatus = () => {
    let status
    if (isInstalled) {
      status = prettyBytes(disksize)
    } else {
      if (isDownloading) {
        status = getProgressElement(progress.progress, downsize)
      } else if (progress.state === 'unzipping') {
        status = t('wine.manager.unzipping', 'Unzipping')
      } else {
        status = prettyBytes(downsize)
      }
    }
    return status
  }

  return (
    <>
      <div className="wineManagerListItem">
        <span className="wineManagerTitleList">{version}</span>
        <div className="wineManagerListDate">{date}</div>
        <div className="wineManagerListSize">{renderStatus()}</div>
        <span className="icons">
          {!isInstalled && !isDownloading && !unZipping && (
            <DownIcon className="downIcon" onClick={() => install()} />
          )}
          {(isDownloading || unZipping) && (
            <StopIcon
              onClick={() => ipcRenderer.send('abortWineInstallation')}
            />
          )}
          {isInstalled && (
            <>
              <SvgButton
                className="material-icons settings folder"
                onClick={() => openInstallDir()}
              >
                <FolderOpen data-testid="setinstallpathbutton" />
              </SvgButton>
              <SvgButton
                className="material-icons settings folder"
                onClick={() => openInstallDir()}
              >
                <StopIcon onClick={() => remove()} />
              </SvgButton>
            </>
          )}
        </span>
      </div>
    </>
  )
}

function getProgressElement(progress: ProgressInfo, downsize: number) {
  const { percentage, eta, avgSpeed } = progress

  let totalSeconds = eta
  const hours = Math.floor(totalSeconds / 3600)
  totalSeconds %= 3600
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  const percentageAsString = `${percentage}%`
  const bytesAsString = `[${prettyBytes((percentage / 100) * downsize)}]`
  const etaAsString = `| ETA: ${[hours, minutes, seconds].join(':')}`
  const avgSpeedAsString = `(${prettyBytes(avgSpeed)}ps)`

  return (
    <p
      style={{
        color: '#0BD58C',
        fontStyle: 'italic'
      }}
    >
      {[percentageAsString, bytesAsString, avgSpeedAsString, etaAsString].join(
        ' '
      )}
    </p>
  )
}

export default WineItem
