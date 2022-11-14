import './index.css'

import React, {
  lazy,
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
  epicCategories,
  gogCategories,
  sideloadedCategories
} from 'frontend/helpers/library'
import RecentlyPlayed from './components/RecentlyPlayed'

const InstallModal = lazy(
  async () => import('frontend/screens/Library/components/InstallModal')
)

const storage = window.localStorage

type ModalState = {
  game: string
  show: boolean
  runner: Runner
  gameInfo: GameInfo | null
}

export default React.memo(function Library(): JSX.Element {
  const {
    layout,
    libraryStatus,
    refreshing,
    refreshingInTheBackground,
    category,
    epic,
    gog,
    sideloadedLibrary,
    favouriteGames,
    libraryTopSection,
    filterText,
    platform,
    filterPlatform,
    hiddenGames,
    showHidden,
    handleCategory,
    showFavourites: showFavouritesLibrary
  } = useContext(ContextProvider)

  const [showModal, setShowModal] = useState<ModalState>({
    game: '',
    show: false,
    runner: 'legendary' as Runner,
    gameInfo: null
  })
  const [sortDescending, setSortDescending] = useState(
    JSON.parse(storage?.getItem('sortDescending') || 'false')
  )
  const [sortInstalled, setSortInstalled] = useState(
    JSON.parse(storage?.getItem('sortInstalled') || 'true')
  )
  const { t } = useTranslation()
  const backToTopElement = useRef(null)
  const listing = useRef<HTMLDivElement>(null)

  //Remember scroll position
  useLayoutEffect(() => {
    const scrollPosition = parseInt(storage?.getItem('scrollPosition') || '0')

    if (listing.current !== null && scrollPosition > 0) {
      listing.current.scrollTo(0, scrollPosition)
    }
    return () => {
      if (listing.current !== null) {
        storage?.setItem('scrollPosition', listing.current.scrollTop.toString())
      }
    }
  }, [listing])

  // bind back to top button
  useEffect(() => {
    if (backToTopElement.current) {
      const listing = document.querySelector('.listing')
      if (listing) {
        listing.addEventListener('scroll', () => {
          const btn = document.getElementById('backToTopBtn')
          const topSpan = document.getElementById('top')
          if (btn && topSpan) {
            btn.style.visibility =
              listing.scrollTop > 450 ? 'visible' : 'hidden'
          }
        })
      }
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
  }, [epic.username, gog.username])

  const filterByPlatform = (library: GameInfo[], filter: string) => {
    if (!library) {
      return []
    }

    // Epic doesn't offer Linux games, so just default to showing all games there
    if (category === 'legendary' && platform === 'linux') {
      return library
    }

    const isMac = ['osx', 'Mac']

    switch (filter) {
      case 'win':
        return library.filter((game) => {
          return game?.is_installed
            ? game?.install?.platform?.toLowerCase() === 'windows'
            : process?.platform === 'darwin'
            ? !game?.is_mac_native
            : !game?.is_linux_native
        })
      case 'mac':
        return library.filter((game) => {
          return game?.is_installed
            ? isMac.includes(game?.install?.platform ?? '')
            : game?.is_mac_native
        })
      case 'linux':
        return library.filter((game) => {
          return game?.is_installed
            ? game?.install?.platform === 'linux'
            : game?.is_linux_native
        })
      default:
        return library
    }
  }

  // top section
  const showRecentGames = libraryTopSection.startsWith('recently_played')

  const showFavourites =
    libraryTopSection === 'favourites' && !!favouriteGames.list.length

  const favourites: GameInfo[] = useMemo(() => {
    const tempArray: GameInfo[] = []
    if (showFavourites || showFavouritesLibrary) {
      const favouriteAppNames = favouriteGames.list.map(
        (favourite: FavouriteGame) => favourite.appName
      )
      epic.library.forEach((game: GameInfo) => {
        if (favouriteAppNames.includes(game.app_name)) tempArray.push(game)
      })
      gog.library.forEach((game: GameInfo) => {
        if (favouriteAppNames.includes(game.app_name)) tempArray.push(game)
      })
      sideloadedLibrary.forEach((game: GameInfo) => {
        if (favouriteAppNames.includes(game.app_name)) tempArray.push(game)
      })
    }
    return tempArray
  }, [showFavourites, favouriteGames, epic, gog])

  // select library
  const libraryToShow = useMemo(() => {
    let library: Array<GameInfo> = []
    if (showFavouritesLibrary) {
      library = [...favourites].filter((g) =>
        category === 'all' ? g : g.runner === category
      )
    } else {
      const isEpic = epic.username && epicCategories.includes(category)
      const isGog = gog.username && gogCategories.includes(category)
      const epicLibrary = isEpic ? epic.library : []
      const gogLibrary = isGog ? gog.library : []
      const sideloadedApps = sideloadedCategories.includes(category)
        ? sideloadedLibrary
        : []
      library = [...sideloadedApps, ...epicLibrary, ...gogLibrary]
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
        const fuzzySearch = fuse.search(filterText).map((g) => g.item)
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
    library = library.sort((a: { title: string }, b: { title: string }) => {
      const gameA = a.title.toUpperCase().replace('THE ', '')
      const gameB = b.title.toUpperCase().replace('THE ', '')
      return sortDescending ? (gameA > gameB ? -1 : 1) : gameA < gameB ? -1 : 1
    })
    const installed = library.filter((g) => g.is_installed)
    const notInstalled = library.filter(
      (g) => !g.is_installed && !installing.includes(g.app_name)
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
    filterText,
    filterPlatform,
    sortDescending,
    sortInstalled,
    showHidden,
    showFavouritesLibrary
  ])

  if (!epic && !gog) {
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
    <>
      <Header />
      <div className="listing" ref={listing}>
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
              isFirstLane
            />
          </>
        )}

        <LibraryHeader
          list={libraryToShow}
          setSortDescending={setSortDescending}
          setSortInstalled={setSortInstalled}
          sortDescending={sortDescending}
          sortInstalled={sortInstalled}
          handleAddGameButtonClick={() => handleModal('', 'sideload', null)}
        />

        {!!libraryToShow.length ||
          (refreshing && !refreshingInTheBackground && (
            <UpdateComponent inline />
          ))}

        {(!refreshing || refreshingInTheBackground) && (
          <GamesList
            library={libraryToShow}
            layout={layout}
            handleGameCardClick={handleModal}
          />
        )}
      </div>

      <button id="backToTopBtn" onClick={backToTop} ref={backToTopElement}>
        <ArrowDropUp className="material-icons" />
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
    </>
  )
})
