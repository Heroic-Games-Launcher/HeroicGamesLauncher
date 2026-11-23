import { useCallback, useEffect, useState } from 'react'
import type { GameInfo } from 'common/types'
import type { SteamLaunchTarget } from 'common/types/steam'

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
  appName: string,
  gameInfo: GameInfo | null | undefined,
  enabled: boolean
): SteamLaunchTargetsState {
  const [targets, setTargets] = useState<SteamLaunchTarget[]>([])
  const [selected, setSelected] = useState('')

  const active =
    enabled && gameInfo?.runner === 'steam' && !!gameInfo.is_installed
  const installPath = gameInfo?.install?.install_path

  const refresh = useCallback(async () => {
    if (!active) {
      setTargets([])
      return
    }
    const result = await window.api.getSteamLaunchTargets(appName)
    setTargets(result.targets)
    setSelected(result.selected ?? '')
  }, [appName, active])

  useEffect(() => {
    void refresh()
  }, [refresh, installPath])

  const select = useCallback(
    async (targetId: string) => {
      setSelected(targetId)
      await window.api.setSteamLaunchTarget(appName, targetId)
    },
    [appName]
  )

  const effective =
    targets.find((target) => target.id === selected) ??
    targets.find((target) => target.isDefault)

  return { targets, selected, select, refresh, effective }
}
