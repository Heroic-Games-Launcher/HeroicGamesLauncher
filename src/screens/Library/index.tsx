import './index.css'

import React, { lazy, useContext, useState } from 'react'

import { GameInfo } from 'src/types'
import ContextProvider from 'src/state/ContextProvider'
import cx from 'classnames'

import ArrowDropUp from '@material-ui/icons/ArrowDropUp'
import { UpdateComponent } from 'src/components/UI'
import { useTranslation } from 'react-i18next'
import { getLibraryTitle } from './constants'

const GameCard = lazy(() => import('src/screens/Library/components/GameCard'))
const InstallModal = lazy(
  () => import('src/screens/Library/components/InstallModal')
)

interface Props {
  library: Array<GameInfo>
  showRecentsOnly?: boolean
}

window.onscroll = () => {
  const pageOffset =
    document.documentElement.scrollTop || document.body.scrollTop
  const btn = document.getElementById('backToTopBtn')
  if (btn) btn.style.visibility = pageOffset > 450 ? 'visible' : 'hidden'
}

export const Library = ({ library, showRecentsOnly }: Props) => {
  const { layout, gameUpdates, refreshing, category, filter } =
    useContext(ContextProvider)
  const [showModal, setShowModal] = useState({ game: '', show: false })
  const { t } = useTranslation()

  const backToTop = () => {
    const anchor = document.getElementById('top')
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  function handleModal(appName: string) {
    setShowModal({ game: appName, show: true })
  }

  if (refreshing && !showRecentsOnly) {
    return <UpdateComponent />
  }

  return (
    <>
      {showModal.show && (
        <InstallModal
          appName={showModal.game}
          backdropClick={() => setShowModal({ game: '', show: false })}
        />
      )}
      <span id="top" />
      <h3 className="libraryHeader">
        {showRecentsOnly
          ? t('Recent', 'Played Recently')
          : getLibraryTitle(category, filter, t)}
      </h3>
      <div
        style={!library.length ? { backgroundColor: 'transparent' } : {}}
        className={cx({
          gameList: showRecentsOnly || layout === 'grid',
          gameListLayout: layout !== 'grid' && !showRecentsOnly
        })}
      >
        {!!library.length &&
          library.map(
            ({
              title,
              art_square,
              art_cover,
              art_logo,
              app_name,
              is_installed,
              is_mac_native,
              is_game,
              install: { version, install_size, is_dlc }
            }: GameInfo) => {
              if (is_dlc) {
                return null
              }
              const hasUpdate = gameUpdates?.includes(app_name)
              return (
                <GameCard
                  key={app_name}
                  cover={art_square}
                  coverList={art_cover}
                  logo={art_logo}
                  title={title}
                  appName={app_name}
                  isInstalled={is_installed}
                  isGame={is_game}
                  version={`${version}`}
                  size={`${install_size}`}
                  hasUpdate={hasUpdate}
                  buttonClick={() => handleModal(app_name)}
                  forceCard={showRecentsOnly}
                  isMacNative={is_mac_native}
                />
              )
            }
          )}
      </div>
      <button id="backToTopBtn" onClick={backToTop}>
        <ArrowDropUp className="material-icons" />
      </button>
    </>
  )
}
