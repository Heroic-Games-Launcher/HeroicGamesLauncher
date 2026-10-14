import { useAwaited } from './useAwaited'
import type { GameHandle } from '../helpers/ipc'

export const useKnownFixes = (game: GameHandle) => {
  return useAwaited(window.api.getKnownFixes, game)
}
