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
