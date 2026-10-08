import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import type { InstallProgress, Runner } from 'common/types'
import { addSample, InstallProgressPoint } from './progressTimeline'

type StoreType = Record<`${string}_${Runner}`, InstallProgress>

interface ProgressHistoryStore {
  history: Record<string, InstallProgressPoint[]>
  add: (key: string, progress: InstallProgress) => void
  clear: (key: string) => void
}

const useInstallProgressRaw = create<StoreType>()(() => ({}))
const useInstallProgressHistoryRaw = create<ProgressHistoryStore>()((set) => ({
  history: {},
  add: (key, progress) =>
    set((state) => ({
      history: {
        ...state.history,
        [key]: addSample(
          state.history[key] ?? [],
          { download: progress.downSpeed, disk: progress.diskSpeed },
          Date.now()
        )
      }
    })),
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
