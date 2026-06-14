import { GameInfo } from 'common/types'
import { create } from 'zustand'
import type { GameHandle } from '../helpers/ipc'

interface InstallGameModalStateClosed {
  isOpen: false
  game?: undefined
  gameInfo?: undefined
  action?: undefined
}

interface InstallGameModalStateOpen {
  isOpen: boolean
  game: GameHandle
  gameInfo: GameInfo | null
  action: 'install' | 'import'
}

type InstallGameModalState =
  | InstallGameModalStateClosed
  | InstallGameModalStateOpen

export const useInstallGameModal = create<InstallGameModalState>()(() => ({
  isOpen: false
}))

export const openInstallGameModal = (
  args: Pick<InstallGameModalStateOpen, 'game' | 'gameInfo' | 'action'>
) => {
  useInstallGameModal.setState({
    isOpen: true,
    ...args
  })
}

export const closeInstallGameModal = () => {
  useInstallGameModal.setState({
    isOpen: false
  })
}
