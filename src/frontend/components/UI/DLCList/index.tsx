import React from 'react'
import { useTranslation } from 'react-i18next'
import DLC from './DLC'
import './index.scss'
import { GameInfo } from 'common/types'
import type { GameHandle } from 'frontend/helpers/ipc'

type Props = {
  dlcs: GameHandle[]
  mainAppInfo: GameInfo
  onClose: () => void
}

const DlcList = ({ dlcs, mainAppInfo, onClose }: Props) => {
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
              key={dlc.id}
              dlc={dlc}
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
