import React from 'react'
import { Game } from '../types'
import GameCard from './UI/GameCard'

interface Props {
  library: Array<Game>
}

// TODO: Add a list options instead of Grid only
export const Library = ({ library }: Props) => {
  return (
    <>
      <div className="gameList">
        {library.length ? (
          library.map(
            ({ title, art_square, art_logo, app_name, isInstalled }: Game) => (
              <GameCard
                key={app_name}
                cover={art_square}
                logo={art_logo}
                title={title}
                appName={app_name}
                isInstalled={isInstalled}
              />
            )
          )
        ) : (
          <div className="noGames">No Games Found</div>
        )}
      </div>
    </>
  )
}
