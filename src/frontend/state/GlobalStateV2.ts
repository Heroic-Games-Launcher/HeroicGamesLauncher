import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import type { GetLogFileArgs } from 'backend/logger/paths'
import type { GameInfo } from 'common/types'
import type { GameSettingsModalType } from '../screens/Settings/components/SettingsModal'

interface GlobalStateV2 {
  uploadLogFileProps:
    | false
    | {
        logFileArgs: GetLogFileArgs
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

const useGlobalStateRaw = create<GlobalStateV2>()((set) => ({
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

/**
 * Wrapper around {@link useGlobalStateRaw} to only re-render if
 * the return value of `selector` changes
 * @param selector A function picking state out of {@link GlobalStateV2}. If the
 *                 return value of this function changes, the component is
 *                 re-rendered
 */
const useGlobalState = <T>(
  selector: Parameters<typeof useShallow<GlobalStateV2, T>>[0]
) => useGlobalStateRaw(useShallow(selector))

/**
 * Shorthand to select properties from {@link GlobalStateV2}
 * @example
 * ```ts
 * const { foo, bar } = useGlobalStateKeys('foo', 'bar')
 * ```
 * is equivalent to
 * ```ts
 * const { foo, bar } = useGlobalState(({ foo, bar }) => ({ foo, bar }))
 * ```
 * @param keys The keys to return. Properties of {@link GlobalStateV2}
 */
const useGlobalStateKeys = <Keys extends (keyof GlobalStateV2)[]>(
  ...keys: Keys
): Pick<GlobalStateV2, Keys[number]> =>
  useGlobalState(
    (state) =>
      Object.fromEntries(keys.map((key) => [key, state[key]])) as {
        [key in Keys[number]]: GlobalStateV2[key]
      }
  )

export default {
  ...useGlobalState,
  keys: useGlobalStateKeys,
  setState: useGlobalStateRaw.setState
}
