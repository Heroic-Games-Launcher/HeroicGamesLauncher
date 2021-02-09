import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from '../state/ContextProvider'

import { Game } from '../types'
import GameCard from './UI/GameCard'
import GameList from './UI/GameList'

interface Props {
  library: Array<Game>
}


window.onscroll =  () => {
  const pageOffset = document.documentElement.scrollTop || document.body.scrollTop,
    btn = document.getElementById('backToTopBtn');
  if (btn) btn.style.visibility = pageOffset > 450 ? 'visible' : 'hidden';
};


// TODO: Add a list options instead of Grid only
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
      {layout === 'grid' ? (
        <div className="gameList">
          {library.length ? (
            library.map(
              ({
                title,
                art_square,
                is_dlc,
                art_logo,
                app_name,
                isInstalled,
              }: Game) => {
                if (is_dlc) {
                  return null
                }
                return (
                  <GameCard
                    key={app_name}
                    cover={art_square}
                    logo={art_logo}
                    title={title}
                    appName={app_name}
                    isInstalled={isInstalled}
                  />
                )
              }
            )
          ) : (
              <div className="noGames">{t('nogames')}</div>
            )}
        </div>
      ) : <div className="gameListLayout">
          {library.length ? (
            library.map(
              ({
                title,
                art_cover,
                is_dlc,
                art_logo,
                app_name,
                isInstalled,
              }: Game) => {
                if (is_dlc) {
                  return null
                }
                return (
                  <GameList
                    key={app_name}
                    cover={art_cover}
                    logo={art_logo}
                    title={title}
                    appName={app_name}
                    isInstalled={isInstalled}
                  />
                )
              }
            )
          ) : (
              <div className="noGames">{t('nogames')}</div>
            )}
        </div>}
     
      <button id="backToTopBtn" onClick={backToTop} ><span className="material-icons">arrow_drop_up</span></button>
    </>
  )
}
