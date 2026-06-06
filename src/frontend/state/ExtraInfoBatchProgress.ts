import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

interface ExtraInfoBatchProgressState {
  isActive: boolean
  totalGames: number
  completedGames: number
  currentGameTitle: string
  startBatch: (total: number) => void
  updateProgress: (completed: number, currentTitle: string) => void
  finishBatch: () => void
}

const useExtraInfoBatchProgressRaw = create<ExtraInfoBatchProgressState>()((set) => ({
  isActive: false,
  totalGames: 0,
  completedGames: 0,
  currentGameTitle: '',
  startBatch: (total) => set({ isActive: true, totalGames: total, completedGames: 0, currentGameTitle: '' }),
  updateProgress: (completed, currentTitle) => set({ completedGames: completed, currentGameTitle: currentTitle }),
  finishBatch: () => set({ isActive: false, totalGames: 0, completedGames: 0, currentGameTitle: '' })
}))

export const useExtraInfoBatchProgress = <T>(
  selector: Parameters<typeof useShallow<ExtraInfoBatchProgressState, T>>[0]
) => useExtraInfoBatchProgressRaw(useShallow(selector))