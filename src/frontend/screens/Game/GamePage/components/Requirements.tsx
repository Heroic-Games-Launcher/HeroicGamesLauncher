import { useContext } from 'react'
import GameContext from '../../GameContext'
import GameRequirements from '../../GameRequirements'

const Requirements = () => {
  const { gameExtraInfo } = useContext(GameContext)

  if (!gameExtraInfo?.reqs?.length) {
    return null
  }

  return <GameRequirements reqs={gameExtraInfo.reqs} />
}

export default Requirements
