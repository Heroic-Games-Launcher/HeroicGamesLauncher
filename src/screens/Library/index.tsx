import './index.css'

import React, { lazy, useContext, useEffect, useRef, useState } from 'react'

import { GameInfo, Runner } from 'src/types'
import ContextProvider from 'src/state/ContextProvider'
import cx from 'classnames'

import ArrowDropUp from '@material-ui/icons/ArrowDropUp'
import { UpdateComponent } from 'src/components/UI'
import { useTranslation } from 'react-i18next'
import { getLibraryTitle } from './constants'
import ActionIcons from 'src/components/UI/ActionIcons'

const GameCard = lazy(() => import('src/screens/Library/components/GameCard'))
const InstallModal = lazy(
  () => import('src/screens/Library/components/InstallModal')
)

interface Props {
  library: Array<GameInfo>
  showRecentsOnly?: boolean
}

export const Library = ({ library, showRecentsOnly }: Props) => {
  const { layout, gameUpdates, refreshing, category, filter } =
    useContext(ContextProvider)
  const [showModal, setShowModal] = useState({
    game: '',
    show: false,
    runner: 'legendary' as Runner
  })
  const { t } = useTranslation()
  const backToTopElement = useRef(null)

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

  if (refreshing && !showRecentsOnly) {
    return <UpdateComponent />
  }

  function titleWithIcons() {
    return (
      <div className="titleWithIcons">
        {getLibraryTitle(category, filter, t)}
        <ActionIcons />
      </div>
    )
  }

  return (
    <>
      {showModal.show && (
        <InstallModal
          appName={showModal.game}
          runner={showModal.runner}
          backdropClick={() =>
            setShowModal({ game: '', show: false, runner: 'legendary' })
          }
        />
      )}
      <h3 className="libraryHeader">
        {showRecentsOnly ? t('Recent', 'Played Recently') : titleWithIcons()}
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
              is_linux_native,
              runner,
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
                  runner={runner}
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
                  buttonClick={() => handleModal(app_name, runner)}
                  forceCard={showRecentsOnly}
                  isMacNative={is_mac_native}
                  isLinuxNative={is_linux_native}
                />
              )
            }
          )}
      </div>
      {!showRecentsOnly && (
        <button id="backToTopBtn" onClick={backToTop} ref={backToTopElement}>
          <ArrowDropUp className="material-icons" />
        </button>
      )}
    </>
  )
}
