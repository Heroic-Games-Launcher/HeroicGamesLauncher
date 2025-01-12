import { GameInfo } from 'common/types'
import { GameSettingsModalTypes } from 'frontend/screens/Settings/components/SettingsModal'
import { create } from 'zustand'

interface GameSettingsModalOpen {
  isOpen: boolean
  type?: GameSettingsModalTypes
  gameInfo?: GameInfo
}

export const useGameSettingsModal = create<GameSettingsModalOpen>()(() => ({
  isOpen: false
}))

export const openGameSettingsModal = (gameInfo: GameInfo) => {
  useGameSettingsModal.setState({ isOpen: true, gameInfo, type: 'settings' })
}

export const openGameLogsModal = (gameInfo: GameInfo) => {
  useGameSettingsModal.setState({ isOpen: true, gameInfo, type: 'log' })
}

export const openGameCategoriesModal = (gameInfo: GameInfo) => {
  useGameSettingsModal.setState({ isOpen: true, gameInfo, type: 'category' })
}

export const closeSettingsModal = () => {
  useGameSettingsModal.setState({
    isOpen: false,
    gameInfo: undefined,
    type: undefined
  })
}
