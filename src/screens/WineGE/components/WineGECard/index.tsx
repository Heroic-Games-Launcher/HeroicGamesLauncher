import './index.css'

import React from 'react'

import { WineGEInfo } from 'src/types'
import { ReactComponent as DownIcon } from 'src/assets/down-icon.svg'
import { ReactComponent as StopIcon } from 'src/assets/stop-icon.svg'
import { ContextMenu, ContextMenuTrigger } from 'react-contextmenu'
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
  hasUpdate
  //installDir
}: WineGEInfo) => {
  const { t } = useTranslation()

  const onProgress = (progress: string) =>
  {
    console.log(progress);
  }

  async function install () {
    return await ipcRenderer.invoke(
      'installWineGE',
      {
        version: version,
        date: date,
        downsize: downsize,
        disksize: disksize,
        download: download,
        checksum: checksum,
        isInstalled: isInstalled,
        hasUpdate: hasUpdate,
        installDir: '~/test'
      },
      onProgress
    );
  }

  const renderIcon = () => {
    const icons = [];
    if (!isInstalled || hasUpdate)
    {
      icons.push(<DownIcon className="downIcon" onClick={() => install()} />);
    }

    if (isInstalled)
    {
      icons.push(<StopIcon onClick={() => {return}} />);
    }

    return icons;
  }

  const getSizeInMB = (value: number) =>
  {
    return (value / (1024*1024)).toFixed(2);
  }

  return (
    <>
      <ContextMenuTrigger id={version}>
        <div className="winegeListItem">
          <span className="winegeTitleList">{version}</span>
          <div className="winegeListDate">{date}</div>
          <div className="winegeListSize">
            {isInstalled ?
              t('winege.diskspace') + ': ' + getSizeInMB(disksize).toString() + ' MB':
              t('winege.download') + ': ' + getSizeInMB(downsize).toString() + ' MB'
            }
          </div>
          <span className="icons">
            {renderIcon().map((component) => component)}
          </span>
        </div>
        <hr style={{ opacity: 0.1, width: '90%' }} />
        <ContextMenu id={version} className="contextMenu">
        </ContextMenu>
      </ContextMenuTrigger>
    </>
  )
}

export default WineGECard
