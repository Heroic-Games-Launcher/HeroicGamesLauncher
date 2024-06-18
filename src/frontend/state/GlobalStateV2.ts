import i18next from 'i18next'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

import { configStore } from '../helpers/electronStores'
import type {
  ExternalLinkDialogOptions,
  HelpItem,
  SettingsModalType
} from '../types'
import type {
  ExperimentalFeatures,
  GameInfo,
  GameStatus,
  LibraryTopSectionOptions,
  Runner
} from 'common/types'

const RTL_LANGUAGES = ['fa', 'ar']

interface GlobalStateV2 extends ExperimentalFeatures {
  isFullscreen: boolean
  isFrameless: boolean

  language: string
  isRTL: boolean
  setLanguage: (language: string) => void

  gameUpdates: string[]
  refresh: (checkUpdates?: boolean) => Promise<void>

  helpItems: Record<string, HelpItem>
  addHelpItem: (key: string, item: HelpItem) => void
  removeHelpItem: (key: string) => void

  isSettingsModalOpen:
    | { value: false; type?: undefined; gameInfo?: undefined }
    | { value: true; type: SettingsModalType; gameInfo: GameInfo }
  setIsSettingsModalOpen: (
    newState: GlobalStateV2['isSettingsModalOpen'] | false
  ) => void

  libraryStatus: Record<`${string}_${Runner}`, GameStatus>

  externalLinkDialogOptions: ExternalLinkDialogOptions

  libraryTopSection: LibraryTopSectionOptions
}

const useGlobalState = create<GlobalStateV2>()(
  persist(
    (set, get) => ({
      isFullscreen: false,
      isFrameless: false,

      language: configStore.get('language', 'en'),
      isRTL: RTL_LANGUAGES.includes(configStore.get('language', 'en')),
      setLanguage: (language) => {
        window.api.changeLanguage(language)
        configStore.set('language', language)
        i18next.changeLanguage(language)

        const isRTL = RTL_LANGUAGES.includes(language)
        document.body.classList.toggle('isRTL', isRTL)

        set({ language, isRTL })
      },

      gameUpdates: [],
      refresh: async (checkUpdates = false) => {
        const promises: Promise<unknown>[] = []

        if (checkUpdates) {
          const updateCheckPromise = window.api
            .checkGameUpdates()
            .then((updates) => {
              set({ gameUpdates: updates })
            })
          promises.push(updateCheckPromise)
        }

        await Promise.all(promises)
      },

      helpItems: {},
      addHelpItem: (key, item) => {
        set({ helpItems: { ...get().helpItems, [key]: item } })
      },
      removeHelpItem: (key) => {
        const updatedHelpItems = get().helpItems
        delete updatedHelpItems[key]
        set({ helpItems: updatedHelpItems })
      },

      isSettingsModalOpen: { value: false },
      setIsSettingsModalOpen: (value) => {
        if (typeof value === 'boolean')
          set({ isSettingsModalOpen: { value: false } })
        else set({ isSettingsModalOpen: value })
      },

      libraryStatus: {},

      enableNewDesign: false,
      enableHelp: false,
      automaticWinetricksFixes: true,

      externalLinkDialogOptions: { showDialog: false },

      libraryTopSection: 'disabled'
    }),
    {
      name: 'globalState',
      partialize: (state) => ({
        gameUpdates: state.gameUpdates,
        language: state.language
      })
    }
  )
)

// Picks out properties described by `keys` from GlobalStateV2. Only causes
// a re-render if one of the listed properties changes. Returns an object with
// all specified keys
// Equivalent to `const foo = useGlobalState(useShallow((state) => state.foo))`
// for each key provided
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

const setIsFullscreen = (isFullscreen: boolean) =>
  useGlobalState.setState({ isFullscreen })
window.api.isFullscreen().then(setIsFullscreen)
window.api.handleFullscreen((e, isFullscreen) => setIsFullscreen(isFullscreen))

const setIsFrameless = (isFrameless: boolean) =>
  useGlobalState.setState({ isFrameless })
window.api.isFrameless().then(setIsFrameless)

window.api.handleGameStatus((_e, newStatus) => {
  const key = `${newStatus.appName}_${newStatus.runner}`
  const oldStatus: GameStatus | undefined =
    useGlobalState.getState().libraryStatus[key]

  if (
    oldStatus?.status === newStatus.status &&
    oldStatus.context === newStatus.context
  )
    return

  if (!oldStatus || !['error', 'done'].includes(newStatus.status)) {
    useGlobalState.setState({
      libraryStatus: {
        ...useGlobalState.getState().libraryStatus,
        [key]: newStatus
      }
    })
    return
  }

  // FIXME: Do we really just want to throw away the new status now?
  const libraryStatusWithoutThisApp = useGlobalState.getState().libraryStatus
  delete libraryStatusWithoutThisApp[key]
  useGlobalState.setState({ libraryStatus: libraryStatusWithoutThisApp })

  // If the game was updating before, assume the update is now done
  if (oldStatus.status === 'updating') {
    useGlobalState.setState({
      gameUpdates: useGlobalState
        .getState()
        .gameUpdates.filter((appName) => appName !== newStatus.appName)
    })
  }

  // TODO: Refresh the library
})

useGlobalState.subscribe((state, prev) => {
  if (state.libraryStatus === prev.libraryStatus) return

  const pendingOps = Object.values(state.libraryStatus).some(
    ({ status }) => status !== 'playing' && status !== 'done'
  )

  if (pendingOps) window.api.lock()
  else window.api.unlock()
})

window.api.requestAppSettings().then((settings) => {
  if (settings.experimentalFeatures)
    useGlobalState.setState({
      ...settings.experimentalFeatures
    })

  if (settings.libraryTopSection)
    useGlobalState.setState({ libraryTopSection: settings.libraryTopSection })
})

export { useGlobalState, useShallowGlobalState }
