import './index.css'

import React, {
  lazy,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import ContextProvider from 'src/state/ContextProvider'

import ArrowDropUp from '@mui/icons-material/ArrowDropUp'
import { Header, UpdateComponent } from 'src/components/UI'
import { useTranslation } from 'react-i18next'
import { getLibraryTitle } from './constants'
import ActionIcons from 'src/components/UI/ActionIcons'
import { GamesList } from './components/GamesList'
import { GameInfo, Runner } from 'src/types'

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
    recentGames,
    favouriteGames,
    libraryTopSection,
    filterText,
    platform,
    filterPlatform,
    hiddenGames,
    showHidden
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

  function handleSortDescending() {
    setSortDescending(!sortDescending)
    storage.setItem('sortDescending', JSON.stringify(!sortDescending))
  }

  function handleSortInstalled() {
    setSortInstalled(!sortInstalled)
    storage.setItem('sortInstalled', JSON.stringify(!sortInstalled))
  }

  function titleWithIcons() {
    return (
      <div className="titleWithIcons">
        {getLibraryTitle(category, filter, t)}
        <ActionIcons
          sortDescending={sortDescending}
          toggleSortDescending={() => handleSortDescending()}
          sortInstalled={sortInstalled}
          toggleSortinstalled={() => handleSortInstalled()}
        />
      </div>
    )
  }

  // cache list of games being installed
  const [installing, setInstalling] = useState<string[]>([])

  useEffect(() => {
    const newInstalling = libraryStatus
      .filter((st) => st.status === 'installing')
      .map((st) => st.appName)

    setInstalling(newInstalling)
  }, [libraryStatus])

  const filterLibrary = (library: GameInfo[], filter: string) => {
    if (!library) {
      return []
    }

    if (filter.includes('UE_')) {
      return library.filter((game) => {
        if (!game.compatible_apps) {
          return false
        }
        return game.compatible_apps.includes(filter)
      })
    } else {
      switch (filter) {
        case 'unreal':
          return library.filter(
            (game) =>
              game.is_ue_project || game.is_ue_asset || game.is_ue_plugin
          )
        case 'asset':
          return library.filter((game) => game.is_ue_asset)
        case 'plugin':
          return library.filter((game) => game.is_ue_plugin)
        case 'project':
          return library.filter((game) => game.is_ue_project)
        default:
          return library.filter((game) => game.is_game)
      }
    }
  }

  const filterByPlatform = (library: GameInfo[], filter: string) => {
    if (category === 'epic' && platform === 'linux') {
      return library.filter((game) => game.is_game)
    }

    const isMac = ['osx', 'Mac']

    switch (filter) {
      case 'win':
        return library.filter((game) => {
          return game.is_installed
            ? game.install.platform === 'windows'
            : process.platform === 'darwin'
            ? !game.is_mac_native
            : !game.is_linux_native
        })
      case 'mac':
        return library.filter((game) => {
          return game.is_installed
            ? isMac.includes(game.install.platform ?? '')
            : game.is_mac_native
        })
      case 'linux':
        return library.filter((game) => {
          return game.is_installed
            ? game.install.platform === 'linux'
            : game.is_linux_native
        })
      default:
        return library.filter((game) => game.is_game)
    }
  }

  // select library
  const libraryToShow = useMemo(() => {
    let library = category === 'epic' ? epic.library : gog.library

    // filter
    try {
      const filterRegex = new RegExp(filterText, 'i')
      const textFilter = ({ title, app_name }: GameInfo) =>
        filterRegex.test(title) || filterRegex.test(app_name)
      library = filterByPlatform(
        filterLibrary(library, filter).filter(textFilter),
        filterPlatform
      )
    } catch (error) {
      console.log(error)
    }

    // hide hidden
    const hiddenGamesAppNames = hiddenGames.list.map((hidden) => hidden.appName)

    if (!showHidden) {
      library = library.filter(
        (game) => !hiddenGamesAppNames.includes(game.app_name)
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

  // top section
  const showRecentGames =
    libraryTopSection === 'recently_played' &&
    !!recentGames.length &&
    category !== 'unreal'

  const showFavourites =
    libraryTopSection === 'favourites' &&
    !!favouriteGames.list.length &&
    category !== 'unreal'

  const favourites: GameInfo[] = useMemo(() => {
    const tempArray: GameInfo[] = []
    if (showFavourites) {
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

  return (
    <>
      <Header list={libraryToShow} />

      <div className="listing">
        <span id="top" />
        {showRecentGames && (
          <>
            <h3 className="libraryHeader">{t('Recent', 'Played Recently')}</h3>
            <GamesList
              library={recentGames}
              handleGameCardClick={handleModal}
            />
          </>
        )}

        {showFavourites && (
          <>
            <h3 className="libraryHeader">{t('favourites', 'Favourites')}</h3>
            <GamesList library={favourites} handleGameCardClick={handleModal} />
          </>
        )}

        <h3 className="libraryHeader">{titleWithIcons()}</h3>

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
