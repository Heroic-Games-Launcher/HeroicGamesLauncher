import React from 'react'
import { Game } from '../types'
import GameCard from './UI/GameCard'

interface Props {
  library: Array<Game>
}

export const Library = ({ library }: Props) => {
  return (
    <>
    <div className="gameList">
     {library.length &&
       library.map(({title, art_square, app_name, isInstalled}: Game) => 
       <GameCard 
          key={app_name}
          cover={art_square}
          title={title}
          appName={app_name}
          isInstalled={isInstalled}
          />
        )
       }
    </div>
    </>
  )
}
