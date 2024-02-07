import { GameInfo } from 'common/types'
import { DLCInfo } from 'common/types/legendary'
import DLCList from 'frontend/components/UI/DLCList'
import React from 'react'

interface LegendaryModifyInstallModalProps {
  dlcs: DLCInfo[]
  gameInfo: GameInfo
  onClose: () => void
}

export default function LegendaryModifyInstallModal({
  dlcs,
  gameInfo,
  onClose
}: LegendaryModifyInstallModalProps) {
  return (
    <DLCList
      dlcs={dlcs}
      runner={'legendary'}
      mainAppInfo={gameInfo}
      onClose={() => onClose()}
    />
  )
}
