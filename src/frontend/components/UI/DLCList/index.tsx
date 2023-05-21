import React from 'react'
import { useTranslation } from 'react-i18next'
import { DLCInfo } from 'common/types/legendary'
import DLC from './DLC'
import './index.scss'
import { Runner } from 'common/types'

type Props = {
  dlcs: DLCInfo[]
  runner: Runner
}

const DlcList = ({ dlcs, runner }: Props) => {
  const { t } = useTranslation()

  return (
    <div className="wineList">
      <div className="dlcHeader">
        <span>{t('dlc.title', 'Title')}</span>
        <span>{t('dlc.actions', 'Actions')}</span>
      </div>
      {dlcs.map((dlc) => {
        return <DLC key={dlc.app_name} dlc={dlc} runner={runner} />
      })}
    </div>
  )
}

export default React.memo(DlcList)
