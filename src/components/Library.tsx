import React, { lazy, useContext } from 'react'

import cx from 'classnames'

import ArrowDropUp from '@material-ui/icons/ArrowDropUp'

import { Game } from '../types'
import ContextProvider from '../state/ContextProvider'

const GameCard = lazy(() => import('./UI/GameCard'))

interface Props {
  library: Array<Game>
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
          gameListLayout: layout !== 'grid',
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
              isInstalled,
              version,
              install_size,
              is_dlc,
            }: Game) => {
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
                  isInstalled={isInstalled}
                  version={version}
                  size={install_size}
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
