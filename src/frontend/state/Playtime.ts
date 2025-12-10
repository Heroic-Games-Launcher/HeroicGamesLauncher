import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import type { Playtime, Runner } from 'common/types'

type StoreType = Record<`${string}_${Runner}`, Playtime>

const usePlaytimeRaw = create<StoreType>()(() => ({}))

window.api.playtime.updateSlot((e, game_id, runner, playtime) => {
  const key = `${game_id}_${runner}`
  usePlaytimeRaw.setState({ [key]: playtime })
})

export const usePlaytime = <T>(
  selector: Parameters<typeof useShallow<StoreType, T>>[0]
) => usePlaytimeRaw(useShallow(selector))
