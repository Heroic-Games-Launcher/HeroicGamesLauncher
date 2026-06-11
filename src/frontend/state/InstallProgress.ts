import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import type { InstallProgress, Runner } from 'common/types'

type StoreType = Record<`${string}_${Runner}`, InstallProgress>

const useInstallProgressRaw = create<StoreType>()(() => ({}))

window.api.onProgressUpdate((e, { appName, progress, runner }) => {
  const key = `${appName}_${runner}`
  useInstallProgressRaw.setState({ [key]: progress })
})

export const useInstallProgress = <T>(
  selector: Parameters<typeof useShallow<StoreType, T>>[0]
) => useInstallProgressRaw(useShallow(selector))

export function clearInstallProgress(appName: string, runner: Runner) {
  const key = `${appName}_${runner}` as `${string}_${Runner}`
  useInstallProgressRaw.setState({
    [key]: { bytes: '0.00MB', eta: '00:00:00', percent: 0 }
  })
}
