import './index.css'

import React, { useContext, useState } from 'react'

import { ToolsInfo, Path } from 'src/types'
import { ReactComponent as DownIcon } from 'src/assets/down-icon.svg'
import { ReactComponent as StopIcon } from 'src/assets/stop-icon.svg'
import { SvgButton } from 'src/components/UI'
import FolderOpen from '@material-ui/icons/FolderOpen'
import { ContextMenu, ContextMenuTrigger } from 'react-contextmenu'
import ContextProvider from 'src/state/ContextProvider'
import { useTranslation } from 'react-i18next'

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
  installDir
}: 
ToolsInfo) => {
  const { t } = useTranslation()
  const { refreshTools } = useContext(ContextProvider)
  const [downloadProgress, setDownloadProgress] = useState<number>(0)
  const [isUnzipping, setIsUnzipping] = useState<boolean>(false)

  ipcRenderer.on('download' + version, (e, progress) => {
    setDownloadProgress(progress)
  })

  ipcRenderer.on('unzip' + version, (e, progress) => {
    setIsUnzipping(progress)
  })

  async function install() {
    ipcRenderer
      .invoke('openDialog', {
        buttonLabel: t('box.choose'),
        properties: ['openDirectory'],
        title: t('box.wineInstallPath', 'Select the install path.')
      })
      .then(({ path }: Path) => {
        ipcRenderer
          .invoke('installTool', {
            version: version,
            date: date,
            downsize: downsize,
            disksize: disksize,
            download: download,
            checksum: checksum,
            isInstalled: isInstalled,
            hasUpdate: hasUpdate,
            installDir: path
          })
          .then((response) => {
            if (response) {
              refreshTools(false)
            }
          })
      })
  }

  async function remove() {
    ipcRenderer.invoke('removeTool', {
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
        refreshTools(false)
      }
    })
  }

  function openInstallDir() {
    ipcRenderer.send('showItemInFolder', installDir)
  }

  const renderIcon = () => {
    const icons = []
    if (!isInstalled || hasUpdate) {
      icons.push(<DownIcon className="downIcon" onClick={() => install()} />)
    }

    if (isInstalled) {
      icons.push(
        <SvgButton
          className="material-icons settings folder"
          onClick={() => openInstallDir()}
        >
          <FolderOpen data-testid="setinstallpathbutton" />
        </SvgButton>
      )
      icons.push(
        <StopIcon onClick={() => remove()} />
      )
    }

    return icons
  }

  const renderStatus = () => {
    let status = ''
    if (isInstalled) {
      status =
        t('tools.diskspace') + ': ' + getSizeInMB(disksize).toString() + ' MB'
    } else {
      if (!isUnzipping) {
        status =
          downloadProgress !== 0
            ? t('tools.download') +
              ': ' +
              getSizeInMB(downloadProgress * downsize).toString() +
              ' / ' +
              getSizeInMB(downsize).toString() +
              ' MB'
            : t('tools.download') +
              ': ' +
              getSizeInMB(downsize).toString() +
              ' MB'
      } else {
        status = t('tools.unzipping')
      }
    }
    return status
  }

  const getSizeInMB = (value: number) => {
    return (value / (1024 * 1024)).toFixed(2)
  }

  return (
    <>
      <ContextMenuTrigger id={version}>
        <div className="toolsListItem">
          <span className="toolsTitleList">{version}</span>
          <div className="toolsListDate">{date}</div>
          <div className="toolsListSize">{renderStatus()}</div>
          <span className="icons">
            {renderIcon().map((component) => component)}
          </span>
        </div>
        <hr style={{ opacity: 0.1, width: '90%' }} />
        <ContextMenu id={version} className="contextMenu"></ContextMenu>
      </ContextMenuTrigger>
    </>
  )
}

export default ToolCard
