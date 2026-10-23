import { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Heart } from 'lucide-react'
import { GameInfo } from 'common/types'
import { Button, Icon } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import GameContext from '../../GameContext'
import DotsMenu from './DotsMenu'
import MainButton from './MainButton'
import SettingsButton from './SettingsButton'

interface Props {
  gameInfo: GameInfo
  handlePlay: (gameInfo: GameInfo) => Promise<void>
  handleInstall: (
    is_installed: boolean
  ) => Promise<void | { status: 'done' | 'error' | 'abort' }>
  handleUpdate: () => void
}

const GameActions = ({
  gameInfo,
  handlePlay,
  handleInstall,
  handleUpdate
}: Props) => {
  const { t } = useTranslation('gamepage')
  const { favouriteGames } = useContext(ContextProvider)
  const { appName } = useContext(GameContext)

  const title = gameInfo.overrides?.title || gameInfo.title

  const isFavourite = useMemo(
    () => !!favouriteGames.list.find((game) => game.appName === appName),
    [favouriteGames, appName]
  )

  const isBrowserGame = gameInfo.install.platform === 'Browser'

  return (
    <div className="gameActions">
      <MainButton
        gameInfo={gameInfo}
        handlePlay={handlePlay}
        handleInstall={handleInstall}
      />

      <DotsMenu gameInfo={gameInfo} handleUpdate={handleUpdate} />

      {!isBrowserGame && <SettingsButton gameInfo={gameInfo} />}

      <Button
        variant="ghost"
        className="gameActions__favourite"
        title={
          isFavourite
            ? t('button.unfavourite', 'Remove from Favourites')
            : t('button.favourite', 'Add to Favourites')
        }
        aria-pressed={isFavourite}
        onClick={() =>
          isFavourite
            ? favouriteGames.remove(appName)
            : favouriteGames.add(appName, title)
        }
        icon={
          <Icon
            glyph={Heart}
            size="lg"
            fill={isFavourite ? 'currentColor' : 'none'}
          />
        }
      />
    </div>
  )
}

export default GameActions
