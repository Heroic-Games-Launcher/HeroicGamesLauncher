import React, { useContext } from 'react'
import { GameInfo, Runner } from 'src/types'
import cx from 'classnames'
import GameCard from '../GameCard'
import ContextProvider from 'src/state/ContextProvider'
import { useTranslation } from 'react-i18next'

interface Props {
  library: GameInfo[]
  layout?: string
  isFirstLane?: boolean
  handleGameCardClick: (app_name: string, runner: Runner) => void
  onlyInstalled?: boolean
}

export const GamesList = ({
  library = [],
  layout = 'grid',
  handleGameCardClick,
  isFirstLane = false,
  onlyInstalled = false
}: Props): JSX.Element => {
  const { gameUpdates } = useContext(ContextProvider)
  const { t } = useTranslation()

  return (
    <div
      style={!library.length ? { backgroundColor: 'transparent' } : {}}
      className={cx({
        gameList: layout === 'grid',
        gameListLayout: layout === 'list',
        firstLane: isFirstLane
      })}
    >
      {layout === 'list' && (
        <div className="gameListHeader">
          <span>{t('game.title', 'Game Title')}</span>
          <span>{t('game.status', 'Status')}</span>
          <span>{t('game.store', 'Store')}</span>
          <span>{t('wine.actions', 'Action')}</span>
        </div>
      )}
      {!!library.length &&
        library.map(
          ({
            title,
            art_square,
            art_cover,
            art_logo,
            app_name,
            is_installed,
            runner,
            cloud_save_enabled,
            is_game,
            install: { version, install_size, is_dlc, platform }
          }: GameInfo) => {
            if (is_dlc) {
              return null
            }
            if (!is_installed && onlyInstalled) {
              return null
            }

            const hasUpdate = is_installed && gameUpdates?.includes(app_name)
            return (
              <GameCard
                key={app_name}
                runner={runner}
                cover={art_square}
                coverList={art_cover}
                logo={art_logo}
                hasCloudSave={cloud_save_enabled}
                title={title}
                appName={app_name}
                isInstalled={is_installed}
                isGame={is_game}
                version={`${version}`}
                size={`${install_size}`}
                hasUpdate={hasUpdate}
                buttonClick={() => handleGameCardClick(app_name, runner)}
                forceCard={layout === 'grid'}
                installedPlatform={platform}
              />
            )
          }
        )}
    </div>
  )
}
