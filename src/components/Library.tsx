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
    <div className="topBar">
      <div className="leftCluster"></div>
      <div className="title">Library</div>
      <div className="rightCluster">
        <div className="username">{user}</div>
        <div className="settings"></div>
      </div>
    </div>
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
