import i18next, { t } from 'i18next'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

import { configStore } from '../helpers/electronStores'
import type {
  DialogModalOptions,
  ExternalLinkDialogOptions,
  HelpItem,
  InstallModalOptions,
  SettingsModalType
} from '../types'
import type {
  ConnectivityStatus,
  ExperimentalFeatures,
  FavouriteGame,
  GameInfo,
  GameStatus,
  HiddenGame,
  LibraryTopSectionOptions,
  Runner
} from 'common/types'
import { defaultThemes } from '../components/UI/ThemeSelector'
import { getGameInfo, launch } from '../helpers'

const RTL_LANGUAGES = ['fa', 'ar']
const DEFAULT_THEME = 'midnightMirage'

// function to load the new key or fallback to the old one
const loadCurrentCategories = () => {
  const currentCategories =
    localStorage.getItem('current_custom_categories') || null
  if (!currentCategories) {
    const currentCategory =
      localStorage.getItem('current_custom_category') || null
    if (!currentCategory) {
      return []
    } else {
      return [currentCategory]
    }
  } else {
    return JSON.parse(currentCategories) as string[]
  }
}

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

  hiddenGames: HiddenGame[]
  addHiddenGame: (gameToAdd: HiddenGame) => void
  removeHiddenGame: (appName: string) => void

  favouriteGames: FavouriteGame[]
  addFavouriteGame: (gameToAdd: FavouriteGame) => void
  removeFavouriteGame: (appName: string) => void

  theme: string

  connectivity: { status: ConnectivityStatus; retryIn: number }

  dialogModalOptions: DialogModalOptions
  showResetDialog: () => void

  primaryFontFamily: string
  secondaryFontFamily: string
  setPrimaryFontFamily: (family: string, save?: boolean) => void
  setSecondaryFontFamily: (family: string, save?: boolean) => void

  disableDialogBackdropClose: boolean

  activeController: string

  installModalOptions: InstallModalOptions

  zoomPercent: number

  allTilesInColor: boolean
  titlesAlwaysVisible: boolean

  hideChangelogsOnStartup: boolean
  lastChangelogShown: string | null

  // The currently active category filters
  currentCustomCategories: string[]
  // Maps category names to games (appNames) included in that category
  customCategories: Record<string, string[]>
  getCustomCategories: () => string[]
  addCustomCategory: (categoryName: string) => void
  removeCustomCategory: (categoryName: string) => void
  renameCustomCategory: (oldName: string, newName: string) => void
  addGameToCustomCategory: (categoryName: string, appName: string) => void
  removeGameFromCustomCategory: (categoryName: string, appName: string) => void

  refreshing: boolean
  refreshingInTheBackground: boolean
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

      libraryTopSection: 'disabled',

      hiddenGames: configStore.get('games.hidden', []),
      addHiddenGame: (game) =>
        set({ hiddenGames: [...get().hiddenGames, game] }),
      removeHiddenGame: (game) => {
        const updatedHiddenGames = get().hiddenGames.filter(
          ({ appName }) => appName !== game
        )
        set({
          hiddenGames: updatedHiddenGames
        })
      },

      favouriteGames: configStore.get('games.favourites', []),
      addFavouriteGame: (game) =>
        set({ favouriteGames: [...get().favouriteGames, game] }),
      removeFavouriteGame: (game) => {
        const updatedFavouriteGames = get().favouriteGames.filter(
          ({ appName }) => appName !== game
        )
        set({
          favouriteGames: updatedFavouriteGames
        })
      },

      theme: configStore.get('theme', DEFAULT_THEME),

      connectivity: { status: 'online', retryIn: 0 },

      dialogModalOptions: { showDialog: false },
      showResetDialog: () => {
        const resetDialog: DialogModalOptions = {
          showDialog: true,
          title: t('box.reset-heroic.question.title', 'Reset Heroic'),
          message: t(
            'box.reset-heroic.question.message',
            "Are you sure you want to reset Heroic? This will remove all Settings and Caching but won't remove your Installed games or your Epic credentials. Portable versions (AppImage, WinPortable, ...) of heroic needs to be restarted manually afterwards."
          ),
          buttons: [
            { text: t('box.yes'), onClick: window.api.resetHeroic },
            { text: t('box.no') }
          ]
        }
        set({ dialogModalOptions: resetDialog })
      },

      primaryFontFamily: configStore.get(
        'actionsFontFamily',
        getComputedStyle(document.documentElement).getPropertyValue(
          '--default-primary-font-family'
        )
      ),
      secondaryFontFamily: configStore.get(
        'contentFontFamily',
        getComputedStyle(document.documentElement).getPropertyValue(
          '--default-secondary-font-family'
        )
      ),
      setPrimaryFontFamily: (family, save = true) => {
        if (save) set({ primaryFontFamily: family })

        document.documentElement.style.setProperty(
          '--primary-font-family',
          family
        )
      },
      setSecondaryFontFamily: (family, save = true) => {
        if (save) set({ secondaryFontFamily: family })

        document.documentElement.style.setProperty(
          '--secondary-font-family',
          family
        )
      },

      disableDialogBackdropClose: configStore.get(
        'disableDialogBackdropClose',
        false
      ),

      activeController: '',

      installModalOptions: { show: false },

      zoomPercent: configStore.get('zoomPercent', 100),

      allTilesInColor: configStore.get('allTilesInColor', false),
      titlesAlwaysVisible: configStore.get('titlesAlwaysVisible', false),

      hideChangelogsOnStartup: false,
      lastChangelogShown: JSON.parse(
        localStorage.getItem('last_changelog') ?? 'null'
      ),

      currentCustomCategories: loadCurrentCategories(),
      customCategories: configStore.get('games.customCategories', {}),
      getCustomCategories: () => Object.keys(get().customCategories),
      addCustomCategory: (categoryName) => {
        const { customCategories, currentCustomCategories } = get()
        customCategories[categoryName] = []
        set({ customCategories })

        // when adding a new category, if there are categories selected, select the new
        // one too so the game doesn't disappear form the library
        if (currentCustomCategories.length) {
          set({
            currentCustomCategories: [...currentCustomCategories, categoryName]
          })
        }
      },
      removeCustomCategory: (categoryName) => {
        const { customCategories, currentCustomCategories } = get()
        delete customCategories[categoryName]
        set({
          customCategories,
          currentCustomCategories: currentCustomCategories.filter(
            (name) => name !== categoryName
          )
        })
      },
      renameCustomCategory: (oldName, newName) => {
        const { customCategories, currentCustomCategories } = get()
        if (!(oldName in customCategories)) return
        customCategories[newName] = customCategories[oldName]
        delete customCategories[oldName]
        set({ customCategories })

        const oldIndex = currentCustomCategories.findIndex(
          (appName) => appName === oldName
        )
        if (oldIndex !== -1) {
          currentCustomCategories[oldIndex] = newName
          set({ currentCustomCategories })
        }
      },
      addGameToCustomCategory: (categoryName, appName) => {
        const { customCategories } = get()
        customCategories[categoryName] = [
          ...customCategories[categoryName],
          appName
        ]
        set({ customCategories })
      },
      removeGameFromCustomCategory: (categoryName, appName) => {
        const { customCategories } = get()
        customCategories[categoryName] = customCategories[categoryName].filter(
          (name) => name !== appName
        )
        set({ customCategories })
      },

      refreshing: false,
      refreshingInTheBackground: true
    }),
    {
      name: 'globalState',
      partialize: (state) => ({
        gameUpdates: state.gameUpdates,
        language: state.language,
        hiddenGames: state.hiddenGames,
        favouriteGames: state.favouriteGames,
        theme: state.theme,
        primaryFontFamily: state.primaryFontFamily,
        secondaryFontFamily: state.secondaryFontFamily,
        disableDialogBackdropClose: state.disableDialogBackdropClose,
        zoomPercent: state.zoomPercent,
        allTilesInColor: state.allTilesInColor,
        titlesAlwaysVisible: state.titlesAlwaysVisible,
        lastChangelogShown: state.lastChangelogShown,
        currentCustomCategories: state.currentCustomCategories,
        customCategories: state.customCategories
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

  if (settings.hideChangelogsOnStartup)
    useGlobalState.setState({
      hideChangelogsOnStartup: settings.hideChangelogsOnStartup
    })
})

async function setTheme(themeClass: string) {
  document.querySelector('style.customTheme')?.remove()

  if (
    themeClass !== DEFAULT_THEME &&
    !Object.keys(defaultThemes).includes(themeClass)
  ) {
    const cssContent = await window.api.getThemeCSS(themeClass)
    themeClass = themeClass
      .replace('.css', '') // remove extension
      .replace(/[\s.]/, '_') // remove dots and empty spaces
    const style = document.createElement('style')
    style.classList.add('customTheme')
    style.innerHTML = cssContent
    document.body.insertAdjacentElement('afterbegin', style)
  }

  document.body.className = themeClass

  if (navigator['windowControlsOverlay']?.visible) {
    const titlebarOverlay = Object.fromEntries(
      ['height', 'color', 'symbol-color']
        .map((item) => [
          item === 'symbol-color' ? 'symbolColor' : item,
          getComputedStyle(document.body)
            .getPropertyValue(`--titlebar-${item}`)
            .trim()
        ])
        .filter(([, val]) => !!val)
    )
    window.api.setTitleBarOverlay(titlebarOverlay)
  }
}

useGlobalState.subscribe(async (state, prev) => {
  if (state.theme === prev.theme) return

  return setTheme(state.theme)
})
void setTheme(useGlobalState.getState().theme)

// listen to custom connectivity-changed event to update state
window.api.onConnectivityChanged((_, connectivity) => {
  useGlobalState.setState({ connectivity })
})

// get the current status
window.api
  .getConnectivityStatus()
  .then((connectivity) => useGlobalState.setState({ connectivity }))

window.api.handleShowDialog((_e, title, message, type, buttons) =>
  useGlobalState.setState({
    dialogModalOptions: { showDialog: true, title, message, type, buttons }
  })
)

useGlobalState
  .getState()
  .setPrimaryFontFamily(useGlobalState.getState().primaryFontFamily, false)
useGlobalState
  .getState()
  .setSecondaryFontFamily(useGlobalState.getState().secondaryFontFamily, false)

window.addEventListener('controller-changed', (e) =>
  useGlobalState.setState({ activeController: e.detail.controllerId })
)

let zoomTimer: ReturnType<typeof setTimeout> | undefined = undefined
useGlobalState.subscribe((state, prev) => {
  if (state.zoomPercent === prev.zoomPercent) return

  if (zoomTimer) clearTimeout(zoomTimer)
  zoomTimer = setTimeout(() => {
    window.api.setZoomFactor((state.zoomPercent / 100).toString())
  }, 500)
})

window.api.handleInstallGame(async (e, appName, runner) => {
  const currentApp =
    useGlobalState.getState().libraryStatus[`${appName}_${runner}`]

  if (currentApp?.status === 'installing') return

  const gameInfo = await getGameInfo(appName, runner)
  if (!gameInfo || gameInfo.runner === 'sideload') return

  useGlobalState.setState({
    installModalOptions: {
      show: true,
      appName,
      runner,
      gameInfo
    }
  })
})

// Deals launching from protocol. Also checks if the game is already running
window.api.handleLaunchGame(async (e, appName, runner) => {
  const currentApp =
    useGlobalState.getState().libraryStatus[`${appName}_${runner}`]

  // Don't launch if the game is either already running or is currently being
  // modified in some other way
  if (currentApp) return { status: 'error' }

  return launch({
    appName,
    runner,
    hasUpdate: false
  })
})

export { useGlobalState, useShallowGlobalState }
