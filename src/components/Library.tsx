import React from 'react'
import { useTranslation } from 'react-i18next'

import { Game } from '../types'
import GameCard from './UI/GameCard'

interface Props {
  library: Array<Game>
}

// TODO: Add a list options instead of Grid only
export const Library = ({ library }: Props) => {
  const { t } = useTranslation()

  return (
    <>
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
    </>
  )
}
