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

import { notify, size } from 'src/helpers'

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

  if (!version || !downsize) {
    return null
  }

  const isDownloading = progress.state === 'downloading'
  const unZipping = progress.state === 'unzipping'

  async function install() {
    notify([`${version}`, t('notify.install.startInstall')])
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
        switch (response) {
          case 'error':
            notify([`${version}`, t('notify.install.error')])
            break
          case 'abort':
            notify([`${version}`, t('notify.install.canceled')])
            break
          case 'success':
            refreshWineVersionInfo(false)
            notify([`${version}`, t('notify.install.finished')])
            break
          default:
            break
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
          notify([`${version}`, t('notify.uninstalled')])
        }
      })
  }

  function openInstallDir() {
    ipcRenderer.send('showItemInFolder', installDir)
  }

  const renderStatus = () => {
    let status
    if (isInstalled) {
      status = size(disksize)
    } else {
      if (isDownloading) {
        status = getProgressElement(progress.progress, downsize)
      } else if (progress.state === 'unzipping') {
        status = t('wine.manager.unzipping', 'Unzipping')
      } else {
        status = size(downsize)
      }
    }
    return status
  }

  // using one element for the different states so it doesn't
  // lose focus from the button when using a game controller
  const handleMainActionClick = () => {
    if (isInstalled) {
      remove()
    } else if (isDownloading || unZipping) {
      ipcRenderer.send('abortWineInstallation', version)
    } else {
      install()
    }
  }

  const mainActionIcon = () => {
    if (isInstalled || isDownloading || unZipping) {
      return <StopIcon />
    } else {
      return <DownIcon className="downIcon" />
    }
  }

  const mainIconTitle = () => {
    if (isInstalled) {
      return `Uninstall ${version}`
    } else if (isDownloading || unZipping) {
      return `Cancel ${version} installation`
    } else {
      return `Install ${version}`
    }
  }

  return (
    <div className="wineManagerListItem">
      <span className="wineManagerTitleList">{version}</span>
      <div className="wineManagerListDate">{date}</div>
      <div className="wineManagerListSize">{renderStatus()}</div>
      <span className="icons">
        {isInstalled && (
          <SvgButton
            className="material-icons settings folder"
            onClick={() => openInstallDir()}
            title={`Open containing folder for ${version}`}
          >
            <FolderOpen data-testid="setinstallpathbutton" />
          </SvgButton>
        )}

        <SvgButton onClick={handleMainActionClick} title={mainIconTitle()}>
          {mainActionIcon()}
        </SvgButton>
      </span>
    </div>
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
  const bytesAsString = `[${size((percentage / 100) * downsize)}]`
  const etaAsString = `| ETA: ${[hours, minutes, seconds].join(':')}`
  const avgSpeedAsString = `(${size(avgSpeed)}ps)`

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
