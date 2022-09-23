import './index.css'

import React from 'react'

import { InstallParams } from 'common/types'

const DownloadManagerItem = ({ appName }: InstallParams) => {
  //const { t } = useTranslation()

  return (
    <div className="downloadManagerListItem">
      <span className="downloadManagerTitleList">{appName}</span>
      <span className="icons">{}</span>
    </div>
  )
}
export default DownloadManagerItem
