import React from 'react'
import { Game } from '../helper'
import GameCard from './UI/GameCard'
import NavBar from './UI/NavBar'

interface GameList {
  library: Array<Game>,
  user: string
}

export const Library = ({ library, user }: GameList) => {
  return (
    <>
    <NavBar hasGames={Boolean(library.length)} user={user ? user : 'LogIn'} />
    <div className="gameList">
     {
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
