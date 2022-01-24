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
import prettyBytes from 'pretty-bytes'

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
        if (response) {
          refreshWineVersionInfo(false)
        }
      })
      .catch((err) => console.error(err))
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
      .catch((err) => console.error(err))
  }

  function openInstallDir() {
    ipcRenderer.send('showItemInFolder', installDir)
  }

  const renderStatus = () => {
    let status = ''
    if (isInstalled) {
      status = prettyBytes(disksize)
    } else {
      if (isDownloading) {
        status = `${prettyBytes(
          (progress.progress.percentage * downsize) / 100
        )} / ${prettyBytes(downsize)}`
      } else if (progress.state === 'unzipping') {
        status = t('tools.unzipping')
      } else {
        status = prettyBytes(downsize)
      }
    }
    return status
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
          {!isInstalled && !isDownloading && !unZipping && (
            <DownIcon className="downIcon" onClick={() => install()} />
          )}
          {(isDownloading || unZipping) && <StopIcon onClick={() => null} />}
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
