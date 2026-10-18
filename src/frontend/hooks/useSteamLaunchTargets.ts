import { useCallback, useEffect, useState } from 'react'
import type { GameInfo } from 'common/types'
import type { SteamLaunchTarget } from 'common/types/steam'
import type { GameHandle } from 'frontend/helpers/ipc'

export interface SteamLaunchTargetsState {
  targets: SteamLaunchTarget[]
  // Chosen id, empty for automatic
  selected: string
  select: (targetId: string) => Promise<void>
  refresh: () => Promise<void>
  // Chosen target, else the default
  effective?: SteamLaunchTarget
}

/**
 * The game versions Aurelia can launch a Steam game with, and the user's pick.
 */
export function useSteamLaunchTargets(
  game: GameHandle | null | undefined,
  gameInfo: GameInfo | null | undefined,
  enabled: boolean
): SteamLaunchTargetsState {
  const [targets, setTargets] = useState<SteamLaunchTarget[]>([])
  const [selected, setSelected] = useState('')

  const active = enabled && game?.runner === 'steam' && !!gameInfo?.is_installed
  const installPath = gameInfo?.install?.install_path

  const refresh = useCallback(async () => {
    if (!game || !active) {
      setTargets([])
      return
    }
    const result = await window.api.getSteamLaunchTargets(game)
    setTargets(result.targets)
    setSelected(result.selected ?? '')
  }, [game, active])

  useEffect(() => {
    void refresh()
  }, [refresh, installPath])

  const select = useCallback(
    async (targetId: string) => {
      if (!game) return
      setSelected(targetId)
      await window.api.setSteamLaunchTarget(game, targetId)
    },
    [game]
  )

  const effective =
    targets.find((target) => target.id === selected) ??
    targets.find((target) => target.isDefault)

  return { targets, selected, select, refresh, effective }
}
