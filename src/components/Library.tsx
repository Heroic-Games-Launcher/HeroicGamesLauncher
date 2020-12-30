import React from 'react'
import { Game } from '../helper'
import GameCard from './UI/GameCard'

interface GameList {
  library: Array<Game>,
  user: string
}

export const Library = ({ library, user }: GameList) => {
  if (!user) {
    return null
  }

  return (
    <>
    <h1>{user}'s Library</h1>
    <div className="gameList">
     {
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
