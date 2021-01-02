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

    {/* extract this into its own nav module, with optional args on what the left cluster would do (nothing, nav to /library, etc) */}
    <div className="pageTitle">Library</div>
    <div className="topBar">
      <div className="leftCluster"></div>
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
          userName={user}
       />
       )
      }
    </div>
    </>
  )
}
