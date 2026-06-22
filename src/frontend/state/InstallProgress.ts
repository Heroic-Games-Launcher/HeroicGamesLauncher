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
  const key: `${string}_${Runner}` = `${appName}_${runner}`
  // Reset to a zeroed entry instead of deleting the key: `hasProgress` only
  // updates the displayed progress when the store value is truthy, so a 0% entry
  // resets the on-card bar to 0% on reinstall. Deleting the key would leave the
  // last percentage stuck until the card unmounts.
  useInstallProgressRaw.setState({
    [key]: { bytes: '0.00MB', eta: '00:00:00', percent: 0 }
  })
}
