import './index.css'

import React, { useContext, useState } from 'react'

import { WineGEInfo, Path } from 'src/types'
import { ReactComponent as DownIcon } from 'src/assets/down-icon.svg'
import { ReactComponent as StopIcon } from 'src/assets/stop-icon.svg'
import { SvgButton } from 'src/components/UI'
import Explore from '@material-ui/icons/Explore'
import { ContextMenu, ContextMenuTrigger } from 'react-contextmenu'
import ContextProvider from 'src/state/ContextProvider'
import { useTranslation } from 'react-i18next'

const { ipcRenderer } = window.require('electron')

const WineGECard = ({
  version,
  date,
  downsize,
  disksize,
  download,
  checksum,
  isInstalled,
  hasUpdate,
  //installDir
}:
WineGEInfo) => {
  const { t } = useTranslation()
  const { refreshWineGE } = useContext(ContextProvider)
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
        ipcRenderer.invoke('installWineGE', {
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
          if(response)
          {
            refreshWineGE()
          }
        })
      })
  }

  const renderIcon = () => {
    const icons = []
    if (!isInstalled || hasUpdate) {
      icons.push(<DownIcon className="downIcon" onClick={() => install()} />)
    }

    if (isInstalled) {
      icons.push(<StopIcon onClick={() => {return}}/>)
      icons.push(<SvgButton 
        className="material-icons settings folder" 
        onClick={() => {return}}>
          <Explore data-testid="setinstallpathbutton" />
        </SvgButton>)
    }

    return icons
  }

  const renderStatus = () => {
    let status = ''
    if (isInstalled) {
      status =
        t('winege.diskspace') + ': ' + getSizeInMB(disksize).toString() + ' MB'
    } else {
      if (!isUnzipping) {
        status =
          downloadProgress !== 0
            ? t('winege.download') +
              ': ' +
              getSizeInMB(downloadProgress * downsize).toString() +
              ' / ' +
              getSizeInMB(downsize).toString() +
              ' MB'
            : t('winege.download') +
              ': ' +
              getSizeInMB(downsize).toString() +
              ' MB'
      } else {
        status = t('winege.unzipping')
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
        <div className="winegeListItem">
          <span className="winegeTitleList">{version}</span>
          <div className="winegeListDate">{date}</div>
          <div className="winegeListSize">{renderStatus()}</div>
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

export default WineGECard
