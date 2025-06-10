import './index.css'

import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect
} from 'react'

import ArrowDropUp from '@mui/icons-material/ArrowDropUp'
import { Header, UpdateComponent } from 'frontend/components/UI'
import { useTranslation } from 'react-i18next'
import Fuse from 'fuse.js'

import ContextProvider from 'frontend/state/ContextProvider'

import GamesList from './components/GamesList'
import { FavouriteGame, GameInfo, HiddenGame, Runner } from 'common/types'
import ErrorComponent from 'frontend/components/UI/ErrorComponent'
import LibraryHeader from './components/LibraryHeader'
import {
  amazonCategories,
  epicCategories,
  gogCategories,
  sideloadedCategories
} from 'frontend/helpers/library'
import RecentlyPlayed from './components/RecentlyPlayed'
import { InstallModal } from './components'
import LibraryContext from './LibraryContext'
import { Category, PlatformsFilters, StoresFilters } from 'frontend/types'
import { hasHelp } from 'frontend/hooks/hasHelp'
import EmptyLibraryMessage from './components/EmptyLibrary'
import CategoriesManager from './components/CategoriesManager'
import LibraryTour from './components/LibraryTour'
import AlphabetFilter from './components/AlphabetFilter/AlphabetFilter'

const storage = window.localStorage

const filterByPlatformHelper = (
  library: GameInfo[],
  currentPlatformsFilters: PlatformsFilters,
  currentPlatform: string
): GameInfo[] => {
  if (!library) {
    return []
  }

  let displayedPlatforms: string[] = []
  if (currentPlatformsFilters['win']) {
    displayedPlatforms.push('win')
  }
  if (currentPlatformsFilters['mac'] && currentPlatform === 'darwin') {
    displayedPlatforms.push('mac')
  }
  if (currentPlatformsFilters['linux'] && currentPlatform === 'linux') {
    displayedPlatforms.push('linux')
  }
  if (currentPlatformsFilters['browser']) {
    displayedPlatforms.push('browser')
  }

  if (!displayedPlatforms.length) {
    displayedPlatforms = Object.keys(currentPlatformsFilters)
  }

  if (displayedPlatforms.includes('win')) {
    displayedPlatforms.push('windows')
  }
  if (displayedPlatforms.includes('mac')) {
    displayedPlatforms.push('osx', 'Mac')
  }

  return library.filter((game) => {
    let gamePlatforms: string[] = []
    if (game?.is_installed) {
      gamePlatforms = [game?.install?.platform?.toLowerCase() || 'windows']
    } else {
      if (game.is_linux_native && currentPlatform === 'linux') {
        gamePlatforms.push('linux')
      }
      if (game.is_mac_native && currentPlatform === 'darwin') {
        gamePlatforms.push('mac')
      }
      gamePlatforms.push('windows')
    }
    return gamePlatforms.some((plat) => displayedPlatforms.includes(plat))
  })
}

interface StoreSpecificData {
  library: GameInfo[]
  username?: string
  user_id?: string
}

const computeLibraryData = ({
  epic,
  gog,
  amazon,
  sideloadedLibrary,
  hiddenGames,
  gameUpdates,
  platform,
  customCategories,
  storesFilters,
  platformsFilters,
  filterText,
  showHidden,
  showFavouritesLibrary,
  currentCustomCategories,
  showSupportOfflineOnly,
  showThirdPartyManagedOnly,
  showUpdatesOnly,
  showNonAvailable,
  showInstalledOnly,
  alphabetFilterLetter,
  sortDescending,
  sortInstalled,
  favouritesIds,
  installing,
  applyAlphabetAndSort
}: {
  epic: StoreSpecificData
  gog: StoreSpecificData
  amazon: StoreSpecificData
  sideloadedLibrary: GameInfo[]
  hiddenGames: { list: HiddenGame[] }
  gameUpdates: string[]
  platform: string
  customCategories: { list: Record<string, string[]> }
  storesFilters: StoresFilters
  platformsFilters: PlatformsFilters
  filterText: string
  showHidden: boolean
  showFavouritesLibrary: boolean
  currentCustomCategories: string[] | null
  showSupportOfflineOnly: boolean
  showThirdPartyManagedOnly: boolean
  showUpdatesOnly: boolean
  showNonAvailable: boolean
  showInstalledOnly: boolean
  alphabetFilterLetter: string | null
  sortDescending: boolean
  sortInstalled: boolean
  favouritesIds: string[]
  installing: string[]
  applyAlphabetAndSort: boolean
}): GameInfo[] => {
  let library: GameInfo[] = (() => {
    let displayedStores: string[] = []
    if (storesFilters['gog'] && gog.username) displayedStores.push('gog')
    if (storesFilters['legendary'] && epic.username)
      displayedStores.push('legendary')
    if (storesFilters['nile'] && amazon.user_id) displayedStores.push('nile')
    if (storesFilters['sideload']) displayedStores.push('sideload')

    if (!displayedStores.length) displayedStores = Object.keys(storesFilters)

    const showEpic = epic.username && displayedStores.includes('legendary')
    const showGog = gog.username && displayedStores.includes('gog')
    const showAmazon = amazon.user_id && displayedStores.includes('nile')
    const showSideloaded = displayedStores.includes('sideload')

    const epicLib = showEpic ? epic.library : []
    const gogLib = showGog ? gog.library : []
    const sideloadedApps = showSideloaded ? sideloadedLibrary : []
    const amazonLib = showAmazon ? amazon.library : []
    return [...sideloadedApps, ...epicLib, ...gogLib, ...amazonLib]
  })()

  if (showFavouritesLibrary) {
    library = library.filter((game) =>
      favouritesIds.includes(`${game.app_name}_${game.runner}`)
    )
  } else {
    if (currentCustomCategories && currentCustomCategories.length > 0) {
      const gamesInSelectedCategories = new Set<string>()
      currentCustomCategories.forEach((category) => {
        if (category === 'preset_uncategorized') {
          const categorizedGames = Array.from(
            new Set(Object.values(customCategories.list).flat())
          )
          library.forEach((game) => {
            if (!categorizedGames.includes(`${game.app_name}_${game.runner}`)) {
              gamesInSelectedCategories.add(`${game.app_name}_${game.runner}`)
            }
          })
        } else {
          const gamesInCustomCategory = customCategories.list[category]
          if (gamesInCustomCategory) {
            gamesInCustomCategory.forEach((game) =>
              gamesInSelectedCategories.add(game)
            )
          }
        }
      })
      library = library.filter((game) =>
        gamesInSelectedCategories.has(`${game.app_name}_${game.runner}`)
      )
    }
  }

  if (showSupportOfflineOnly)
    library = library.filter((game) => game.canRunOffline)
  if (showThirdPartyManagedOnly)
    library = library.filter((game) => !!game.thirdPartyManagedApp)
  if (showUpdatesOnly)
    library = library.filter((game) => gameUpdates.includes(game.app_name))
  if (!showNonAvailable) {
    const nonAvailbleGames = storage.getItem('nonAvailableGames') || '[]'
    const nonAvailbleGamesArray = JSON.parse(nonAvailbleGames)
    library = library.filter(
      (game) => !nonAvailbleGamesArray.includes(game.app_name)
    )
  }
  if (showInstalledOnly) library = library.filter((game) => game.is_installed)

  library = filterByPlatformHelper(library, platformsFilters, platform)

  try {
    const options = {
      minMatchCharLength: 1,
      threshold: 0.4,
      useExtendedSearch: true,
      keys: ['title']
    }
    const fuse = new Fuse(library, options)
    if (filterText) {
      const fuzzySearch = fuse.search(filterText).map((game) => game?.item)
      library = fuzzySearch
    }
  } catch (error) {
    console.log('Error during Fuse.js search:', error)
  }

  const hiddenGamesAppNames = hiddenGames.list.map((hidden) => hidden?.appName)
  if (!showHidden) {
    library = library.filter(
      (game) => !hiddenGamesAppNames.includes(game?.app_name)
    )
  }

  if (applyAlphabetAndSort) {
    if (alphabetFilterLetter) {
      if (alphabetFilterLetter === '#') {
        const startsWithNumber = /^[0-9]/
        library = library.filter(
          (game) => game.title && startsWithNumber.test(game.title)
        )
      } else {
        library = library.filter(
          (game) =>
            game.title &&
            game.title
              .toLowerCase()
              .startsWith(alphabetFilterLetter.toLowerCase())
        )
      }
    }

    library = library.sort((a, b) => {
      const gameA = a.title.toUpperCase().replace('THE ', '')
      const gameB = b.title.toUpperCase().replace('THE ', '')
      return sortDescending
        ? -gameA.localeCompare(gameB)
        : gameA.localeCompare(gameB)
    })
    if (sortInstalled) {
      const installedGames = library.filter((game) => game?.is_installed)
      const notInstalledGames = library.filter(
        (game) => !game?.is_installed && !installing.includes(game?.app_name)
      )
      const installingGames = library.filter(
        (g) => !g.is_installed && installing.includes(g.app_name)
      )
      library = [...installedGames, ...installingGames, ...notInstalledGames]
    }
  }
  return library
}

type ModalState = {
  game: string
  show: boolean
  runner: Runner
  gameInfo: GameInfo | null
}

export default React.memo(function Library(): JSX.Element {
  const { t } = useTranslation()

  const {
    libraryStatus,
    refreshing,
    refreshingInTheBackground,
    epic,
    gog,
    amazon,
    sideloadedLibrary,
    favouriteGames,
    libraryTopSection,
    platform,
    currentCustomCategories,
    customCategories,
    hiddenGames,
    gameUpdates
  } = useContext(ContextProvider)

  hasHelp(
    'library',
    t('help.title.library', 'Library'),
    <p>{t('help.content.library', 'Shows all owned games.')}</p>
  )

  const [layout, setLayout] = useState(storage.getItem('layout') || 'grid')
  const handleLayout = (layout: string) => {
    storage.setItem('layout', layout)
    setLayout(layout)
  }

  let initialStoresfilters
  const storesFiltersString = storage.getItem('storesFilters')
  if (storesFiltersString) {
    initialStoresfilters = JSON.parse(storesFiltersString) as StoresFilters
  } else {
    const storedCategory = (storage.getItem('category') as Category) || 'all'
    initialStoresfilters = {
      legendary: epicCategories.includes(storedCategory),
      gog: gogCategories.includes(storedCategory),
      nile: amazonCategories.includes(storedCategory),
      sideload: sideloadedCategories.includes(storedCategory)
    }
  }

  const [storesFilters, setStoresFilters_] =
    useState<StoresFilters>(initialStoresfilters)

  const setStoresFilters = (newFilters: StoresFilters) => {
    storage.setItem('storesFilters', JSON.stringify(newFilters))
    setStoresFilters_(newFilters)
  }

  let initialPlatformsfilters
  const plaformsFiltersString = storage.getItem('platformsFilters')
  if (plaformsFiltersString) {
    initialPlatformsfilters = JSON.parse(
      plaformsFiltersString
    ) as PlatformsFilters
  } else {
    const storedCategory = storage.getItem('filterPlatform') || 'all'
    initialPlatformsfilters = {
      win: ['all', 'win'].includes(storedCategory),
      linux: ['all', 'linux'].includes(storedCategory),
      mac: ['all', 'mac'].includes(storedCategory),
      browser: ['all', 'browser'].includes(storedCategory)
    }
  }

  const [platformsFilters, setPlatformsFilters_] = useState<PlatformsFilters>(
    initialPlatformsfilters
  )

  const setPlatformsFilters = (newFilters: PlatformsFilters) => {
    storage.setItem('platformsFilters', JSON.stringify(newFilters))
    setPlatformsFilters_(newFilters)
  }

  const [filterText, setFilterText] = useState('')

  const [showHidden, setShowHidden] = useState(
    JSON.parse(storage.getItem('show_hidden') || 'false')
  )
  const handleShowHidden = (value: boolean) => {
    storage.setItem('show_hidden', JSON.stringify(value))
    setShowHidden(value)
  }

  const [showFavouritesLibrary, setShowFavourites] = useState(
    JSON.parse(storage.getItem('show_favorites') || 'false')
  )
  const handleShowFavourites = (value: boolean) => {
    storage.setItem('show_favorites', JSON.stringify(value))
    setShowFavourites(value)
  }

  const [showInstalledOnly, setShowInstalledOnly] = useState(
    JSON.parse(storage.getItem('show_installed_only') || 'false')
  )
  const handleShowInstalledOnly = (value: boolean) => {
    storage.setItem('show_installed_only', JSON.stringify(value))
    setShowInstalledOnly(value)
  }

  const [showNonAvailable, setShowNonAvailable] = useState(
    JSON.parse(storage.getItem('show_non_available') || 'true')
  )
  const handleShowNonAvailable = (value: boolean) => {
    storage.setItem('show_non_available', JSON.stringify(value))
    setShowNonAvailable(value)
  }

  const [showSupportOfflineOnly, setSupportOfflineOnly] = useState(
    JSON.parse(storage.getItem('show_support_offline_only') || 'false')
  )
  const handleShowSupportOfflineOnly = (value: boolean) => {
    storage.setItem('show_support_offline_only', JSON.stringify(value))
    setSupportOfflineOnly(value)
  }

  const [showThirdPartyManagedOnly, setShowThirdPartyManagedOnly] = useState(
    JSON.parse(storage.getItem('show_third_party_managed_only') || 'false')
  )
  const handleShowThirdPartyOnly = (value: boolean) => {
    storage.setItem('show_third_party_managed_only', JSON.stringify(value))
    setShowThirdPartyManagedOnly(value)
  }

  const [showUpdatesOnly, setShowUpdatesOnly] = useState(
    JSON.parse(storage.getItem('show_updates_only') || 'false')
  )
  const handleShowUpdatesOnly = (value: boolean) => {
    storage.setItem('show_updates_only', JSON.stringify(value))
    setShowUpdatesOnly(value)
  }

  const [showCategories, setShowCategories] = useState(false)

  const [showAlphabetFilter, setShowAlphabetFilter] = useState(true) // Renamed from alphabetFilterVisible
  const handleToggleAlphabetFilter = () => {
    setShowAlphabetFilter((prev) => !prev)
    storage.setItem('showAlphabetFilter', JSON.stringify(!showAlphabetFilter))
  }
  const [alphabetFilterLetter, setAlphabetFilterLetter] = useState<
    string | null
  >(null)

  const [showModal, setShowModal] = useState<ModalState>({
    game: '',
    show: false,
    runner: 'legendary',
    gameInfo: null
  })
  const [sortDescending, setSortDescending] = useState(
    JSON.parse(storage?.getItem('sortDescending') || 'false')
  )
  function handleSortDescending(value: boolean) {
    storage.setItem('sortDescending', JSON.stringify(value))
    setSortDescending(value)
  }

  const [sortInstalled, setSortInstalled] = useState(
    JSON.parse(storage?.getItem('sortInstalled') || 'true')
  )
  function handleSortInstalled(value: boolean) {
    storage.setItem('sortInstalled', JSON.stringify(value))
    setSortInstalled(value)
  }

  const handleAlphabetFilterChange = (letter: string | null) => {
    setAlphabetFilterLetter(letter)
  }

  const backToTopElement = useRef(null)

  useLayoutEffect(() => {
    const scrollPosition = parseInt(storage?.getItem('scrollPosition') || '0')

    const storeScrollPosition = () => {
      storage?.setItem('scrollPosition', window.scrollY.toString() || '0')
    }

    window.addEventListener('scroll', storeScrollPosition)
    window.scrollTo(0, scrollPosition || 0)

    return () => {
      window.removeEventListener('scroll', storeScrollPosition)
    }
  }, [])

  useEffect(() => {
    if (backToTopElement.current) {
      window.addEventListener('scroll', () => {
        const btn = document.getElementById('backToTopBtn')
        const topSpan = document.getElementById('top')
        if (btn && topSpan) {
          btn.style.visibility = window.scrollY > 450 ? 'visible' : 'hidden'
        }
      })
    }
  }, [backToTopElement])

  const backToTop = () => {
    const anchor = document.getElementById('top')
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  function handleModal(
    appName: string,
    runner: Runner,
    gameInfo: GameInfo | null
  ) {
    setShowModal({ game: appName, show: true, runner, gameInfo })
  }

  const installing = useMemo(
    () =>
      libraryStatus
        .filter((st) => st.status === 'installing')
        .map((st) => st.appName),
    [libraryStatus]
  )

  const showRecentGames = libraryTopSection.startsWith('recently_played')

  const favouriteGamesList = useMemo(() => {
    if (showHidden) {
      return favouriteGames.list
    }

    const hiddenAppNames = hiddenGames.list.map(
      (hidden: HiddenGame) => hidden.appName
    )

    return favouriteGames.list.filter(
      (game) => !hiddenAppNames.includes(game.appName)
    )
  }, [favouriteGames, showHidden, hiddenGames])

  const showFavourites =
    libraryTopSection === 'favourites' && !!favouriteGamesList.length

  const favourites = useMemo(() => {
    const tempArray: GameInfo[] = []
    if (showFavourites || showFavouritesLibrary) {
      const favouriteAppNames = favouriteGamesList.map(
        (favourite: FavouriteGame) => favourite.appName
      )
      epic.library.forEach((game) => {
        if (favouriteAppNames.includes(game.app_name)) tempArray.push(game)
      })
      gog.library.forEach((game) => {
        if (favouriteAppNames.includes(game.app_name)) tempArray.push(game)
      })
      sideloadedLibrary.forEach((game) => {
        if (favouriteAppNames.includes(game.app_name)) tempArray.push(game)
      })
      amazon.library.forEach((game) => {
        if (favouriteAppNames.includes(game.app_name)) tempArray.push(game)
      })
    }
    return tempArray.sort((a, b) => {
      const gameA = a.title.toUpperCase().replace('THE ', '')
      const gameB = b.title.toUpperCase().replace('THE ', '')
      return gameA.localeCompare(gameB)
    })
  }, [
    showFavourites,
    showFavouritesLibrary,
    favouriteGamesList,
    epic,
    gog,
    amazon
  ])

  const favouritesIds = useMemo(() => {
    return favourites.map((game) => `${game.app_name}_${game.runner}`)
  }, [favourites])

  const gamesForAlphabetFilter = useMemo(() => {
    return computeLibraryData({
      epic,
      gog,
      amazon,
      sideloadedLibrary,
      hiddenGames,
      gameUpdates,
      platform,
      customCategories,
      storesFilters,
      platformsFilters,
      filterText,
      showHidden,
      showFavouritesLibrary,
      currentCustomCategories,
      showSupportOfflineOnly,
      showThirdPartyManagedOnly,
      showUpdatesOnly,
      showNonAvailable,
      showInstalledOnly,
      alphabetFilterLetter,
      sortDescending,
      sortInstalled,
      favouritesIds,
      installing,
      applyAlphabetAndSort: false
    })
  }, [
    epic,
    gog,
    amazon,
    sideloadedLibrary,
    hiddenGames.list,
    gameUpdates,
    platform,
    customCategories.list,
    storesFilters,
    platformsFilters,
    filterText,
    showHidden,
    showFavouritesLibrary,
    currentCustomCategories,
    showSupportOfflineOnly,
    showThirdPartyManagedOnly,
    showUpdatesOnly,
    showNonAvailable,
    showInstalledOnly,
    favouritesIds
  ])

  const libraryToShow = useMemo(() => {
    return computeLibraryData({
      epic,
      gog,
      amazon,
      sideloadedLibrary,
      hiddenGames,
      gameUpdates,
      platform,
      customCategories,
      storesFilters,
      platformsFilters,
      filterText,
      showHidden,
      showFavouritesLibrary,
      currentCustomCategories,
      showSupportOfflineOnly,
      showThirdPartyManagedOnly,
      showUpdatesOnly,
      showNonAvailable,
      showInstalledOnly,
      alphabetFilterLetter,
      sortDescending,
      sortInstalled,
      favouritesIds,
      installing,
      applyAlphabetAndSort: true
    })
  }, [
    epic,
    gog,
    amazon,
    sideloadedLibrary,
    hiddenGames.list,
    gameUpdates,
    platform,
    customCategories.list,
    storesFilters,
    platformsFilters,
    filterText,
    showHidden,
    showFavouritesLibrary,
    currentCustomCategories,
    showSupportOfflineOnly,
    showThirdPartyManagedOnly,
    showUpdatesOnly,
    showNonAvailable,
    showInstalledOnly,
    alphabetFilterLetter,
    sortDescending,
    sortInstalled,
    favouritesIds,
    installing
  ])

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    const setHeaderHightCSS = () => {
      if (timer) clearTimeout(timer)

      timer = setTimeout(() => {
        const header = document.querySelector('.Header')
        if (header) {
          const headerHeight = header.getBoundingClientRect().height
          const libraryHeader =
            document.querySelector<HTMLDivElement>('.libraryHeader')
          libraryHeader &&
            libraryHeader.style.setProperty(
              '--header-height',
              `${headerHeight}px`
            )
        }
      }, 50)
    }
    setHeaderHightCSS()
    window.addEventListener('resize', setHeaderHightCSS)

    return () => {
      window.removeEventListener('resize', setHeaderHightCSS)
    }
  }, [])

  if (!epic && !gog && !amazon) {
    return (
      <ErrorComponent
        message={t(
          'generic.error.component',
          'No Games found - Try to logout and login again or one of the options bellow'
        )}
      />
    )
  }

  return (
    <LibraryContext.Provider
      value={{
        storesFilters,
        platformsFilters,
        layout,
        showHidden,
        showFavourites: showFavouritesLibrary,
        showInstalledOnly,
        showNonAvailable,
        filterText,
        setStoresFilters,
        handleLayout: handleLayout,
        setPlatformsFilters,
        handleSearch: setFilterText,
        setShowHidden: handleShowHidden,
        setShowFavourites: handleShowFavourites,
        setShowInstalledOnly: handleShowInstalledOnly,
        setShowNonAvailable: handleShowNonAvailable,
        setSortDescending: handleSortDescending,
        setSortInstalled: handleSortInstalled,
        showSupportOfflineOnly,
        setShowSupportOfflineOnly: handleShowSupportOfflineOnly,
        showThirdPartyManagedOnly,
        setShowThirdPartyManagedOnly: handleShowThirdPartyOnly,
        showUpdatesOnly,
        setShowUpdatesOnly: handleShowUpdatesOnly,
        sortDescending,
        sortInstalled,
        handleAddGameButtonClick: () => handleModal('', 'sideload', null),
        setShowCategories
      }}
    >
      <Header />
      <LibraryTour />

      <div className="listing">
        <span id="top" />
        {showRecentGames && (
          <RecentlyPlayed
            handleModal={handleModal}
            onlyInstalled={libraryTopSection.endsWith('installed')}
            showHidden={showHidden}
          />
        )}

        {showFavourites && !showFavouritesLibrary && (
          <>
            <div className="library-section-header" data-tour="library-header">
              <h3 className="libraryHeader">{t('favourites', 'Favourites')}</h3>
            </div>
            <GamesList
              library={favourites}
              handleGameCardClick={handleModal}
              isFavourite
              isFirstLane
            />
          </>
        )}

        <LibraryHeader
          list={libraryToShow}
          showAlphabetFilter={showAlphabetFilter}
          onToggleAlphabetFilter={handleToggleAlphabetFilter}
        />

        {showAlphabetFilter && (
          <AlphabetFilter
            currentFilter={alphabetFilterLetter}
            onFilterChange={handleAlphabetFilterChange}
            allGames={gamesForAlphabetFilter}
          />
        )}

        {refreshing && !refreshingInTheBackground && <UpdateComponent inline />}

        {libraryToShow.length === 0 && <EmptyLibraryMessage />}

        {libraryToShow.length > 0 &&
          (!refreshing || refreshingInTheBackground) && (
            <GamesList
              library={libraryToShow}
              layout={layout}
              handleGameCardClick={handleModal}
            />
          )}
      </div>

      <button id="backToTopBtn" onClick={backToTop} ref={backToTopElement}>
        <ArrowDropUp id="backToTopArrow" className="material-icons" />
      </button>

      {showModal.show && (
        <InstallModal
          appName={showModal.game}
          runner={showModal.runner}
          gameInfo={showModal.gameInfo}
          backdropClick={() =>
            setShowModal({
              game: '',
              show: false,
              runner: 'legendary',
              gameInfo: null
            })
          }
        />
      )}

      {showCategories && <CategoriesManager />}
    </LibraryContext.Provider>
  )
})
