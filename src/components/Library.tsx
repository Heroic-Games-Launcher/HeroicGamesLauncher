import React, { Dispatch, SetStateAction } from 'react'
import { Game, legendary } from '../helper'
import GameCard from './UI/GameCard'

interface Props {
  library: Array<Game>
  user: string
  refresh: Dispatch<SetStateAction<boolean>>
}

export const Library = ({ library, user, refresh }: Props) => {
  return (
    <>
    <div className="gameList">
     {library.length ?
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
          : user && <button className="button is-primary" onClick={refreshGameList(refresh)}>Update Game List</button>
        }
    </div>
    </>
  )
}

function refreshGameList(refresh: React.Dispatch<React.SetStateAction<boolean>>): ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void) | undefined {
  return async () => {
    refresh(true)
    await legendary('list-games')
    refresh(false)
  }
}

