import { useAwaited } from './useAwaited'
import { Runner } from 'common/types'

export const useKnownFixes = (appName: string, runner: Runner) => {
  return useAwaited(window.api.getKnownFixes, appName, runner)
}
