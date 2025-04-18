import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import type { GameInfo } from 'common/types'
import type { GameSettingsModalType } from '../screens/Settings/components/SettingsModal'

interface GlobalStateV2 {
  uploadLogFileProps:
    | false
    | {
        appNameOrRunner: string
        name: string
      }
  setUploadLogFileProps: (props: GlobalStateV2['uploadLogFileProps']) => void

  settingsModalProps:
    | { isOpen: false }
    | {
        isOpen: true
        type: GameSettingsModalType
        gameInfo: GameInfo
      }
  openGameSettingsModal: (gameInfo: GameInfo) => void
  openGameLogsModal: (gameInfo: GameInfo) => void
  openGameCategoriesModal: (gameInfo: GameInfo) => void
  closeSettingsModal: () => void

  showUploadedLogFileList: boolean
}

const useGlobalState = create<GlobalStateV2>()((set) => ({
  uploadLogFileProps: false,
  setUploadLogFileProps: (uploadLogFileProps) => {
    set({ uploadLogFileProps })
  },

  settingsModalProps: { isOpen: false },
  openGameSettingsModal: (gameInfo) => {
    set({
      settingsModalProps: {
        isOpen: true,
        type: 'settings',
        gameInfo
      }
    })
  },
  openGameLogsModal: (gameInfo) => {
    set({
      settingsModalProps: {
        isOpen: true,
        type: 'log',
        gameInfo
      }
    })
  },
  openGameCategoriesModal: (gameInfo) => {
    set({
      settingsModalProps: {
        isOpen: true,
        type: 'category',
        gameInfo
      }
    })
  },
  closeSettingsModal: () => {
    set({ settingsModalProps: { isOpen: false } })
  },

  showUploadedLogFileList: false
}))

function useShallowGlobalState<Keys extends (keyof GlobalStateV2)[]>(
  ...keys: Keys
): Pick<GlobalStateV2, Keys[number]> {
  return useGlobalState(
    useShallow(
      (state) =>
        Object.fromEntries(keys.map((key) => [key, state[key]])) as {
          [key in Keys[number]]: GlobalStateV2[key]
        }
    )
  )
}

export { useGlobalState, useShallowGlobalState }
