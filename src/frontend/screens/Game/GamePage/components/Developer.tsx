import React, { useContext } from 'react'
import GameContext from '../../GameContext'
import { GameInfo } from 'common/types'

interface Props {
  gameInfo: GameInfo
}

const Developer = ({ gameInfo }: Props) => {
  const { runner } = useContext(GameContext)

  if (runner === 'sideload') {
    return null
  }

  return <div className="developer">{gameInfo.developer}</div>
}

export default Developer
