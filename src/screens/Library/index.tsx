import './index.css'

import React, { lazy, useContext, useEffect, useRef, useState } from 'react'

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
    category,
    filter,
    epic,
    gog,
    recentGames,
    favouriteGames,
    libraryTopSection
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

  // select library and sort
  let libraryToShow = category === 'epic' ? epic.library : gog.library
  libraryToShow = libraryToShow.sort(
    (a: { title: string }, b: { title: string }) => {
      const gameA = a.title.toUpperCase().replace('THE ', '')
      const gameB = b.title.toUpperCase().replace('THE ', '')
      return sortDescending ? (gameA > gameB ? -1 : 1) : gameA < gameB ? -1 : 1
    }
  )
  const installed = libraryToShow.filter((g) => g.is_installed)
  const notInstalled = libraryToShow.filter(
    (g) => !g.is_installed && !installing.includes(g.app_name)
  )
  const installingGames = libraryToShow.filter((g) =>
    installing.includes(g.app_name)
  )
  libraryToShow = sortInstalled
    ? [...installed, ...installingGames, ...notInstalled]
    : libraryToShow

  const showRecentGames =
    libraryTopSection === 'recently_played' &&
    !!recentGames.length &&
    category !== 'unreal'

  const showFavourites =
    libraryTopSection === 'favourites' &&
    !!favouriteGames.list.length &&
    category !== 'unreal'

  const favourites: GameInfo[] = []

  if (showFavourites) {
    const favouriteAppNames = favouriteGames.list.map(
      (favourite) => favourite.appName
    )
    epic.library.forEach((game) => {
      if (favouriteAppNames.includes(game.app_name)) favourites.push(game)
    })
    gog.library.forEach((game) => {
      if (favouriteAppNames.includes(game.app_name)) favourites.push(game)
    })
  }

  const dlcCount = epic.library.filter((lib) => lib.install.is_dlc)
  const numberOfGames =
    category === 'epic'
      ? epic.library.length - dlcCount.length
      : gog.library.length

  return (
    <>
      <Header numberOfGames={numberOfGames} />

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

        {refreshing && <UpdateComponent inline />}

        {!refreshing && (
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
