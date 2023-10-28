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
import {
  FavouriteGame,
  GameInfo,
  GameStatus,
  HiddenGame,
  Runner
} from 'common/types'
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
import { Category } from 'frontend/types'

const storage = window.localStorage

type ModalState = {
  game: string
  show: boolean
  runner: Runner
  gameInfo: GameInfo | null
}

export default React.memo(function Library(): JSX.Element {
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
    hiddenGames
  } = useContext(ContextProvider)

  const [layout, setLayout] = useState(storage.getItem('layout') || 'grid')
  const handleLayout = (layout: string) => {
    storage.setItem('layout', layout)
    setLayout(layout)
  }

  const [category, setCategory] = useState(
    (storage.getItem('category') as Category) || 'legendary'
  )
  const handleCategory = (category: Category) => {
    storage.setItem('category', category)
    setCategory(category)
  }

  const [filterText, setFilterText] = useState('')
  const [filterPlatform, setFilterPlatform] = useState(
    storage.getItem('filterPlatform') || 'all'
  )
  const handlePlatformFilter = (filterPlatform: string) => {
    storage.setItem('filterPlatform', filterPlatform)
    setFilterPlatform(filterPlatform)
  }

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

  const [showNonAvailable, setShowNonAvailable] = useState(
    JSON.parse(storage.getItem('show_non_available') || 'true')
  )
  const handleShowNonAvailable = (value: boolean) => {
    storage.setItem('show_non_available', JSON.stringify(value))
    setShowNonAvailable(value)
  }

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

  const { t } = useTranslation()
  const backToTopElement = useRef(null)

  //Remember scroll position
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

  // bind back to top button
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

  // cache list of games being installed
  const [installing, setInstalling] = useState<string[]>([])

  useEffect(() => {
    const newInstalling = libraryStatus
      .filter((st: GameStatus) => st.status === 'installing')
      .map((st: GameStatus) => st.appName)

    setInstalling(newInstalling)
  }, [libraryStatus])

  useEffect(() => {
    // This code avoids getting stuck on a empty library after logout of the current selected store
    if (epicCategories.includes(category) && !epic.username) {
      handleCategory('all')
    }
    if (gogCategories.includes(category) && !gog.username) {
      handleCategory('all')
    }
    if (amazonCategories.includes(category) && !amazon.user_id) {
      handleCategory('all')
    }
  }, [epic.username, gog.username, amazon.username])

  const filterByPlatform = (library: GameInfo[], filter: string) => {
    if (!library) {
      return []
    }

    // Epic doesn't offer Linux games, so just default to showing all games there
    if (category === 'legendary' && platform === 'linux') {
      return library
    }

    // Amazon Games only offers Windows games, so just default to showing all games there
    if (category === 'nile') {
      return library
    }

    const macArray = ['osx', 'Mac']
    const isMac = platform === 'darwin'

    switch (filter) {
      case 'win':
        return library.filter((game) => {
          return game?.is_installed
            ? game?.install?.platform?.toLowerCase() === 'windows'
            : isMac
            ? !game?.is_mac_native
            : !game?.is_linux_native
        })
      case 'mac':
        return library.filter((game) => {
          return game?.is_installed
            ? macArray.includes(game?.install?.platform ?? '')
            : game?.is_mac_native
        })
      case 'linux':
        return library.filter((game) => {
          return game?.is_installed
            ? game?.install?.platform === 'linux'
            : game?.is_linux_native
        })
      case 'browser':
        return library.filter((game) => {
          return game?.install?.platform === 'Browser'
        })
      default:
        return library
    }
  }

  // top section
  const showRecentGames = libraryTopSection.startsWith('recently_played')

  const showFavourites =
    libraryTopSection === 'favourites' && !!favouriteGames.list.length

  const favourites = useMemo(() => {
    const tempArray: GameInfo[] = []
    if (showFavourites || showFavouritesLibrary) {
      const favouriteAppNames = favouriteGames.list.map(
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
    return tempArray
  }, [showFavourites, showFavouritesLibrary, favouriteGames, epic, gog])

  // select library
  const libraryToShow = useMemo(() => {
    let library: Array<GameInfo> = []
    if (showFavouritesLibrary) {
      library = favourites.filter((game) =>
        category === 'all' ? game : game?.runner === category
      )
    } else {
      const isEpic = epic.username && epicCategories.includes(category)
      const isGog = gog.username && gogCategories.includes(category)
      const isAmazon = amazon.user_id && amazonCategories.includes(category)
      const epicLibrary = isEpic ? epic.library : []
      const gogLibrary = isGog ? gog.library : []
      const sideloadedApps = sideloadedCategories.includes(category)
        ? sideloadedLibrary
        : []
      const amazonLibrary = isAmazon ? amazon.library : []

      library = [
        ...sideloadedApps,
        ...epicLibrary,
        ...gogLibrary,
        ...amazonLibrary
      ]

      if (!showNonAvailable) {
        const nonAvailbleGames = storage.getItem('nonAvailableGames') || '[]'
        const nonAvailbleGamesArray = JSON.parse(nonAvailbleGames)
        library = library.filter(
          (game) => !nonAvailbleGamesArray.includes(game.app_name)
        )
      }
    }

    // filter
    try {
      const filteredLibrary = filterByPlatform(library, filterPlatform)
      const options = {
        minMatchCharLength: 1,
        threshold: 0.4,
        useExtendedSearch: true,
        keys: ['title']
      }
      const fuse = new Fuse(filteredLibrary, options)

      if (filterText) {
        const fuzzySearch = fuse.search(filterText).map((game) => game?.item)
        library = fuzzySearch
      } else {
        library = filteredLibrary
      }
    } catch (error) {
      console.log(error)
    }

    // hide hidden
    const hiddenGamesAppNames = hiddenGames.list.map(
      (hidden: HiddenGame) => hidden?.appName
    )

    if (!showHidden) {
      library = library.filter(
        (game) => !hiddenGamesAppNames.includes(game?.app_name)
      )
    }

    // sort
    library = library.sort((a, b) => {
      const gameA = a.title.toUpperCase().replace('THE ', '')
      const gameB = b.title.toUpperCase().replace('THE ', '')
      return sortDescending
        ? -gameA.localeCompare(gameB)
        : gameA.localeCompare(gameB)
    })
    const installed = library.filter((game) => game?.is_installed)
    const notInstalled = library.filter(
      (game) => !game?.is_installed && !installing.includes(game?.app_name)
    )
    const installingGames = library.filter(
      (g) => !g.is_installed && installing.includes(g.app_name)
    )

    library = sortInstalled
      ? [...installed, ...installingGames, ...notInstalled]
      : library

    return [...library]
  }, [
    category,
    epic.library,
    gog.library,
    amazon.library,
    filterText,
    filterPlatform,
    sortDescending,
    sortInstalled,
    showHidden,
    hiddenGames,
    showFavouritesLibrary,
    showNonAvailable
  ])

  // we need this to do proper `position: sticky` of the Add Game area
  // the height of the Header can change at runtime with different font families
  // and when resizing the window
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    const setHeaderHightCSS = () => {
      if (timer) clearTimeout(timer)

      // adding a timeout so we don't run this for every resize event
      timer = setTimeout(() => {
        console.log('fired')
        const header = document.querySelector('.Header')
        if (header) {
          const headerHeight = header.getBoundingClientRect().height
          const libraryHeader = document.querySelector(
            '.libraryHeader'
          ) as HTMLDivElement
          libraryHeader &&
            libraryHeader.style.setProperty(
              '--header-height',
              `${headerHeight}px`
            )
        }
      }, 50)
    }
    // set when mounted
    setHeaderHightCSS()
    // also listen the resize event
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
        category,
        layout,
        showHidden,
        showFavourites: showFavouritesLibrary,
        showNonAvailable,
        filterPlatform,
        filterText,
        handleCategory: handleCategory,
        handleLayout: handleLayout,
        handlePlatformFilter: handlePlatformFilter,
        handleSearch: setFilterText,
        setShowHidden: handleShowHidden,
        setShowFavourites: handleShowFavourites,
        setShowNonAvailable: handleShowNonAvailable,
        setSortDescending: handleSortDescending,
        setSortInstalled: handleSortInstalled,
        sortDescending,
        sortInstalled
      }}
    >
      <Header />

      <div className="listing">
        <span id="top" />
        {showRecentGames && (
          <RecentlyPlayed
            handleModal={handleModal}
            onlyInstalled={libraryTopSection.endsWith('installed')}
          />
        )}

        {showFavourites && !showFavouritesLibrary && (
          <>
            <h3 className="libraryHeader">{t('favourites', 'Favourites')}</h3>
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
          handleAddGameButtonClick={() => handleModal('', 'sideload', null)}
        />

        {refreshing && !refreshingInTheBackground && <UpdateComponent inline />}

        {(!refreshing || refreshingInTheBackground) && (
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
    </LibraryContext.Provider>
  )
})
