import './index.css'

import React from 'react'

import { InstallParams } from 'common/types'

const DownloadManagerItem = ({ appName }: InstallParams) => {
  //const { t } = useTranslation()

  return (
    <div className="wineManagerListItem">
      <span className="wineManagerTitleList">{appName}</span>
      <div className="wineManagerListDate">{''}</div>
      <div className="wineManagerListSize">{''}</div>
      <span className="icons"></span>
    </div>
  )
}
export default DownloadManagerItem
