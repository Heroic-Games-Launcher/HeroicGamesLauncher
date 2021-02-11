import React, { lazy, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from '../state/ContextProvider'

import { Game } from '../types'
//import GameCard from './UI/GameCard'
const GameCard = lazy(() => import('./UI/GameCard'))

interface Props {
  library: Array<Game>
}

window.onscroll = () => {
  const pageOffset = document.documentElement.scrollTop || document.body.scrollTop,
    btn = document.getElementById('backToTopBtn');
  if (btn) btn.style.visibility = pageOffset > 450 ? 'visible' : 'hidden';
};

export const Library = ({ library }: Props) => {  
  const { t } = useTranslation()
  const { layout } = useContext(ContextProvider)
  const backToTop = () => {
    const anchor = document.getElementById('top')
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

  }

  return (
    <>
      <div className={layout === 'grid' ? "gameList" : "gameListLayout"}>
        {library.length ? (
          library.map(
            ({
              title,
              art_square,
              art_cover,
              art_logo,
              app_name,
              isInstalled,
              version,
              dlcs
            }: Game) => {
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
                  dlcs={dlcs}
                />
              )
            }
          )
        ) : (
            <div className="noGames">{t('nogames')}</div>
          )}
      </div>
      <button id="backToTopBtn" onClick={backToTop} ><span className="material-icons">arrow_drop_up</span></button>
    </>
  )
}
