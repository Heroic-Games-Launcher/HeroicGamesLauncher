import './index.css'

import React, { useContext, useState } from 'react'

import { WineVersionInfo } from 'src/types'
import { ReactComponent as DownIcon } from 'src/assets/down-icon.svg'
import { ReactComponent as StopIcon } from 'src/assets/stop-icon.svg'
import { SvgButton } from 'src/components/UI'
import FolderOpen from '@material-ui/icons/FolderOpen'
import ContextProvider from 'src/state/ContextProvider'
import { useTranslation } from 'react-i18next'
import { ProgressInfo, State } from 'heroic-wine-downloader'

const { ipcRenderer } = window.require('electron')

const ToolCard = ({
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
  }>({ state: 'idle', progress: { percentage: 0 } })

  ipcRenderer.on('progressOf' + version, (e, progress) => {
    setProgress(progress)
  })

  async function install() {
    ipcRenderer
      .invoke('installWineVersion', {
        version: version,
        date: date,
        downsize: downsize,
        disksize: disksize,
        download: download,
        checksum: checksum,
        isInstalled: isInstalled,
        hasUpdate: hasUpdate
      })
      .then((response) => {
        if (response) {
          refreshWineVersionInfo(false)
        }
      })
  }

  async function remove() {
    ipcRenderer
      .invoke('removeWineVersion', {
        version: version,
        date: date,
        downsize: downsize,
        disksize: disksize,
        download: download,
        checksum: checksum,
        isInstalled: isInstalled,
        hasUpdate: hasUpdate,
        installDir: installDir
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
    let status = ''
    if (isInstalled) {
      status =
        t('tools.diskspace') + ': ' + getSizeInMB(disksize).toString() + ' MB'
    } else {
      if (progress.state === 'downloading') {
        status =
          t('tools.download') +
          ': ' +
          getSizeInMB(
            (progress.progress.percentage * downsize) / 100
          ).toString() +
          ' / ' +
          getSizeInMB(downsize).toString() +
          ' MB'
      } else if (progress.state === 'unzipping') {
        status = t('tools.unzipping')
      } else {
        status =
          t('tools.download') + ': ' + getSizeInMB(downsize).toString() + ' MB'
      }
    }
    return status
  }

  const getSizeInMB = (value: number) => {
    return (value / (1024 * 1024)).toFixed(2)
  }

  return (
    <>
      <div className="toolsListItem">
        <span className="toolsTitleList">
          {type} - {version}
        </span>
        <div className="toolsListDate">{date}</div>
        <div className="toolsListSize">{renderStatus()}</div>
        <span className="icons">
          {!isInstalled && (
            <DownIcon className="downIcon" onClick={() => install()} />
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

export default ToolCard
