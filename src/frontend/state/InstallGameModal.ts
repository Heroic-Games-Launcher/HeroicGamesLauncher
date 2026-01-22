import { GameInfo, Runner } from 'common/types'
import { create } from 'zustand'

interface InstallGameModalState {
  isOpen: boolean
  appName?: string
  runner?: Runner
  gameInfo: GameInfo | null
}

export const useInstallGameModal = create<InstallGameModalState>()(() => ({
  isOpen: false,
  gameInfo: null
}))

interface OpenInstallGameModalParams {
  appName: string
  runner: Runner
  gameInfo: GameInfo | null
}
export const openInstallGameModal = ({
  appName,
  runner,
  gameInfo
}: OpenInstallGameModalParams) => {
  useInstallGameModal.setState({
    isOpen: true,
    appName,
    runner,
    gameInfo
  })
}

export const closeInstallGameModal = () => {
  useInstallGameModal.setState({
    isOpen: false
  })
}
