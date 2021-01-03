import React from 'react'
import { Game } from '../helper'
import GameCard from './UI/GameCard'

interface Props {
  library: Array<Game>
  user: string
}

export const Library = ({ library, user }: Props) => {
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
          userName={user}
          />
        )
       }
    </div>
    </>
  )
}
