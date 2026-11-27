import { GameInfo } from 'common/types'
import { create } from 'zustand'

interface StoreStatusWarningState {
  gameInfo: GameInfo | null
  resolve: ((proceed: boolean) => void) | null
}

export const useStoreStatusWarning = create<StoreStatusWarningState>()(() => ({
  gameInfo: null,
  resolve: null
}))

// Acknowledged games, this session
const acknowledged = new Set<string>()

/**
 * Warns once before using abandoned games
 */
export async function confirmStoreStatus(
  gameInfo: GameInfo | null | undefined
): Promise<boolean> {
  if (!gameInfo?.storeStatus) return true
  const key = `${gameInfo.runner}_${gameInfo.app_name}`
  if (acknowledged.has(key)) return true

  // Settle any already open warning
  useStoreStatusWarning.getState().resolve?.(false)

  const proceed = await new Promise<boolean>((resolve) =>
    useStoreStatusWarning.setState({ gameInfo, resolve })
  )
  if (proceed) acknowledged.add(key)
  return proceed
}

export function closeStoreStatusWarning(proceed: boolean) {
  const { resolve } = useStoreStatusWarning.getState()
  useStoreStatusWarning.setState({ gameInfo: null, resolve: null })
  resolve?.(proceed)
}
