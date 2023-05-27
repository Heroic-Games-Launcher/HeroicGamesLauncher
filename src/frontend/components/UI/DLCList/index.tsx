import React from 'react'
import { useTranslation } from 'react-i18next'
import { DLCInfo } from 'common/types/legendary'
import DLC from './DLC'
import './index.scss'
import { GameInfo, Runner } from 'common/types'

type Props = {
  dlcs: DLCInfo[]
  runner: Runner
  mainAppInfo: GameInfo
  onClose: () => void
}

const DlcList = ({ dlcs, runner, mainAppInfo, onClose }: Props) => {
  const { t } = useTranslation()

  return (
    <div className="dlcList">
      {dlcs.length > 0 && (
        <div className="dlcHeader">
          <span className="title">{t('dlc.title', 'Title')}</span>
          <span className="size">{t('dlc.size', 'Size')}</span>
          <span className="actions">{t('dlc.actions', 'Actions')}</span>
        </div>
      )}
      {dlcs.length > 0 &&
        dlcs.map((dlc) => {
          return (
            <DLC
              key={dlc.app_name}
              dlc={dlc}
              runner={runner}
              mainAppInfo={mainAppInfo}
              onClose={onClose}
            />
          )
        })}
      {dlcs.length === 0 && (
        <div className="noDlcFound">{t('dlc.noDlcFound', 'No DLCs found')}</div>
      )}
    </div>
  )
}

export default React.memo(DlcList)
