import './index.css'

import React, {
  lazy,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import ArrowDropUp from '@mui/icons-material/ArrowDropUp'
import { Header, UpdateComponent } from 'src/components/UI'
import { useTranslation } from 'react-i18next'
import Fuse from 'fuse.js'

import ContextProvider from 'src/state/ContextProvider'

import { GamesList } from './components/GamesList'
import { GameInfo, Runner } from 'src/types'
import ErrorComponent from 'src/components/UI/ErrorComponent'
import LibraryHeader from './components/LibraryHeader'
import { epicCategories, gogCategories } from 'src/helpers/library'
import RecentlyPlayed from './components/RecentlyPlayed'

const InstallModal = lazy(
  async () => import('src/screens/Library/components/InstallModal')
)

const storage = window.localStorage

export default function Library(): JSX.Element {
  const {
    layout,
    libraryStatus,
    refreshing,
    refreshingInTheBackground,
    category,
    filter,
    epic,
    gog,
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

  const [showModal, setShowModal] = useState({
    game: '',
    show: false,
    runner: 'legendary' as Runner
  })
  const [sortDescending, setSortDescending] = useState(
    JSON.parse(storage?.getItem('sortDescending') || 'false')
  )
  const [sortInstalled, setSortInstalled] = useState(
    JSON.parse(storage?.getItem('sortInstalled') || 'true')
  )
  const { t } = useTranslation()
  const backToTopElement = useRef(null)

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

  function handleModal(appName: string, runner: Runner) {
    setShowModal({ game: appName, show: true, runner })
  }

  // cache list of games being installed
  const [installing, setInstalling] = useState<string[]>([])

  useEffect(() => {
    const newInstalling = libraryStatus
      .filter((st) => st.status === 'installing')
      .map((st) => st.appName)

    setInstalling(newInstalling)
  }, [libraryStatus])

  useEffect(() => {
    // This code avoids getting stuck on a empty library after logout of the current selected store
    if (epicCategories.includes(category) && !epic.username) {
      handleCategory('gog')
    }
    if (gogCategories.includes(category) && !gog.username) {
      handleCategory('legendary')
    }
  }, [epic.username, gog.username])

  const filterLibrary = (library: GameInfo[], filter: string) => {
    if (!library) {
      return []
    }

    if (filter.includes('UE_')) {
      return library.filter((game) => {
        if (!game?.compatible_apps) {
          return false
        }
        return game?.compatible_apps?.includes(filter)
      })
    } else {
      switch (filter) {
        case 'unreal':
          return library.filter(
            (game) =>
              game.is_ue_project || game?.is_ue_asset || game?.is_ue_plugin
          )
        case 'asset':
          return library.filter((game) => game?.is_ue_asset)
        case 'plugin':
          return library.filter((game) => game?.is_ue_plugin)
        case 'project':
          return library.filter((game) => game?.is_ue_project)
        default:
          return library.filter((game) => game?.is_game)
      }
    }
  }

  const filterByPlatform = (library: GameInfo[], filter: string) => {
    if (!library) {
      return []
    }

    if (category === 'legendary' && platform === 'linux') {
      return library.filter((game) => game?.is_game)
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
        return library.filter((game) => game?.is_game)
    }
  }

  // top section
  const showRecentGames =
    libraryTopSection.startsWith('recently_played') && category !== 'unreal'

  const showFavourites =
    libraryTopSection === 'favourites' &&
    !!favouriteGames.list.length &&
    category !== 'unreal'

  const favourites: GameInfo[] = useMemo(() => {
    const tempArray: GameInfo[] = []
    if (showFavourites || showFavouritesLibrary) {
      const favouriteAppNames = favouriteGames.list.map(
        (favourite) => favourite.appName
      )
      epic.library.forEach((game) => {
        if (favouriteAppNames.includes(game.app_name)) tempArray.push(game)
      })
      gog.library.forEach((game) => {
        if (favouriteAppNames.includes(game.app_name)) tempArray.push(game)
      })
    }
    return tempArray
  }, [showFavourites, favouriteGames, epic, gog])

  // select library
  const libraryToShow = useMemo(() => {
    let library: GameInfo[] = []
    if (showFavouritesLibrary) {
      library = [...favourites].filter((g) =>
        category === 'all' ? g : g.runner === category
      )
    } else {
      const isEpic = epic.username && epicCategories.includes(category)
      const isGog = gog.username && gogCategories.includes(category)
      const epicLibrary = isEpic ? epic.library : []
      const gogLibrary = isGog ? gog.library : []
      library = [...epicLibrary, ...gogLibrary]
    }

    // filter
    try {
      const filteredLibrary = filterByPlatform(
        filterLibrary(library, filter),
        filterPlatform
      )
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
      (hidden) => hidden?.appName
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
    const installingGames = library.filter((g) =>
      installing.includes(g.app_name)
    )
    library = sortInstalled
      ? [...installed, ...installingGames, ...notInstalled]
      : library

    return library
  }, [
    category,
    epic,
    gog,
    filter,
    filterText,
    filterPlatform,
    sortDescending,
    sortInstalled,
    showHidden
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
        <ArrowDropUp className="material-icons" />
      </button>

      {showModal.show && (
        <InstallModal
          appName={showModal.game}
          runner={showModal.runner}
          backdropClick={() =>
            setShowModal({ game: '', show: false, runner: 'legendary' })
          }
        />
      )}
    </>
  )
}
