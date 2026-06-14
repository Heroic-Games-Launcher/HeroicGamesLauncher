import { useMemo } from 'react'
import { GameInfo } from 'common/types'
import DLCList from 'frontend/components/UI/DLCList'
import { GameHandle } from 'frontend/helpers/ipc'
import type { LegendaryInstallInfo } from 'common/types/legendary'

interface LegendaryModifyInstallModalProps {
  gameInstallInfo: LegendaryInstallInfo
  mainAppInfo: GameInfo
  onClose: () => void
}

export default function LegendaryModifyInstallModal({
  gameInstallInfo,
  mainAppInfo,
  onClose
}: LegendaryModifyInstallModalProps) {
  // FIXME: We should never create a GameHandle manually. Ideally we'd
  //        query the DLCs using a storefront-agnostic IPC function
  const dlcs = useMemo(
    () =>
      gameInstallInfo.game.owned_dlc.map(
        ({ app_name }) => new GameHandle(app_name, 'legendary')
      ),
    [gameInstallInfo.game.owned_dlc]
  )

  return (
    <DLCList dlcs={dlcs} mainAppInfo={mainAppInfo} onClose={() => onClose()} />
  )
}
