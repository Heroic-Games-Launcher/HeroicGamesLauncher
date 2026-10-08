import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import type { InstallProgress, Runner } from 'common/types'

type StoreType = Record<`${string}_${Runner}`, InstallProgress>

export interface InstallProgressPoint {
  download: number
  disk: number
  timestamp: number
}

interface ProgressHistoryStore {
  history: Record<string, InstallProgressPoint[]>
  add: (key: string, progress: InstallProgress) => void
  clear: (key: string) => void
}

const useInstallProgressRaw = create<StoreType>()(() => ({}))
const useInstallProgressHistoryRaw = create<ProgressHistoryStore>()((set) => ({
  history: {},
  add: (key, progress) =>
    set((state) => {
      const previousPoints = state.history[key] ?? []
      const previousPoint = previousPoints.at(-1)
      const point: InstallProgressPoint = {
        download: progress.downSpeed ?? previousPoint?.download ?? 0,
        disk: progress.diskSpeed ?? 0,
        timestamp: Date.now()
      }

      return {
        history: {
          ...state.history,
          [key]: [...previousPoints.slice(-99), point]
        }
      }
    }),
  clear: (key) =>
    set((state) => {
      const history = { ...state.history }
      delete history[key]
      return { history }
    })
}))

window.api.onProgressUpdate((e, { appName, progress, runner }) => {
  if (!progress) return

  const key = `${appName}_${runner}`
  useInstallProgressRaw.setState({ [key]: progress })
  useInstallProgressHistoryRaw.getState().add(key, progress)
})

export const useInstallProgress = <T>(
  selector: Parameters<typeof useShallow<StoreType, T>>[0]
) => useInstallProgressRaw(useShallow(selector))

export const useInstallProgressHistory = <T>(
  selector: Parameters<typeof useShallow<ProgressHistoryStore, T>>[0]
) => useInstallProgressHistoryRaw(useShallow(selector))
