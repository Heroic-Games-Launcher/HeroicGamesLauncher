import './index.css'

import React from 'react'

import { WineGEInfo } from 'src/types'
import { ReactComponent as DownIcon } from 'src/assets/down-icon.svg'
import { ContextMenu, ContextMenuTrigger } from 'react-contextmenu'
import { useTranslation } from 'react-i18next'

const WineGECard = ({
  version,
  date,
  downsize,
  disksize,
  download,
  //checksum
  isInstalled
  //hasUpdate
  //installDir
}: WineGEInfo) => {
  const { t } = useTranslation()

  const renderIcon = () => {
    return <DownIcon className="downIcon" onClick={() => {console.log(download)}} />
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
            {renderIcon()}
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
