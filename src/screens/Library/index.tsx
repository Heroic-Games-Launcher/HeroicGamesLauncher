import './index.css'

import React, { lazy, useContext } from 'react'

import { GameInfo } from 'src/types'
import ContextProvider from 'src/state/ContextProvider'
import cx from 'classnames'

import ArrowDropUp from '@material-ui/icons/ArrowDropUp'

const GameCard = lazy(() => import('src/screens/Library/components/GameCard'))

interface Props {
  library: Array<GameInfo>
}

window.onscroll = () => {
  const pageOffset =
    document.documentElement.scrollTop || document.body.scrollTop
  const btn = document.getElementById('backToTopBtn')
  if (btn) btn.style.visibility = pageOffset > 450 ? 'visible' : 'hidden'
}

export const Library = ({ library }: Props) => {
  const { layout, gameUpdates } = useContext(ContextProvider)
  const backToTop = () => {
    const anchor = document.getElementById('top')
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
  return (
    <>
      <div
        style={!library.length ? { backgroundColor: 'transparent' } : {}}
        className={cx({
          gameList: layout === 'grid',
          gameListLayout: layout !== 'grid'
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
              is_game,
              install : {
                version,
                install_size,
                is_dlc
              }
            }: GameInfo) => {
              if (is_dlc) {
                return null
              }
              const hasUpdate = gameUpdates.includes(app_name)
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
