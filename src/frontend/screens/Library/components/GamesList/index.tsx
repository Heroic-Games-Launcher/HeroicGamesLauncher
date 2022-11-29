import React, { useRef } from 'react'
import { Runner } from 'common/types'
import cx from 'classnames'
import GameCard from '../GameCard'
import { useTranslation } from 'react-i18next'
import { Game } from '../../../../state/new/model/Game'
import { AnimatePresence, motion } from 'framer-motion'
import { observer } from 'mobx-react'
import useComputedValue from '../../../../hooks/useComputedValue'
import useGlobalStore from '../../../../hooks/useGlobalStore'

interface Props {
  library: Game[]
  layout?: string
  isFirstLane?: boolean
  handleGameCardClick?: (app_name: string, runner: Runner, game: Game) => void
  onlyInstalled?: boolean
  isRecent?: boolean
  listName?: string
}

const GamesList = (props: Props): JSX.Element => {
  const { t } = useTranslation()
  const { library = [], layout = 'grid', isFirstLane = false } = props

  return (
    <div
      className={cx({
        gameList: layout === 'grid',
        gameListLayout: layout === 'list',
        firstLane: isFirstLane
      })}
      key={props.listName + '-' + layout}
    >
      {layout === 'list' && (
        <div className="gameListHeader">
          <span>{t('game.title', 'Game Title')}</span>
          <span>{t('game.status', 'Status')}</span>
          <span>{t('game.store', 'Store')}</span>
          <span>{t('wine.actions', 'Action')}</span>
        </div>
      )}
      <AnimatePresence>
        {library.map((item, index) => (
          <GameItem key={item.appName} game={item} index={index} {...props} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function getPercValue(val: number, perc: number) {
  return (val * perc) / 100
}

const GameItem = observer(
  ({
    game,
    index,
    handleGameCardClick,
    onlyInstalled,
    layout = 'grid',
    listName,
    isRecent = false
  }: {
    game: Game
    index: number
  } & Props) => {
    const { libraryController } = useGlobalStore()
    const wrapperRef = useRef<HTMLDivElement>(null)
    const cardVisible = useComputedValue(
      () => {
        const scrollPosition = libraryController.listScrollPosition.get()
        if (!scrollPosition) {
          return false
        }
        const bodyHeight = document.body?.clientHeight || 0
        const { offsetTop = 0 } = wrapperRef.current || {}
        const diff = offsetTop - scrollPosition.top
        const percOfScreen = getPercValue(bodyHeight, 20)
        return diff > -percOfScreen && diff < bodyHeight + percOfScreen
      },
      { debounceTime: 300 }
    )

    const {
      app_name,
      is_installed,
      runner,
      install: { is_dlc }
    } = game.data

    if (is_dlc) {
      return null
    }
    if (!is_installed && onlyInstalled) {
      return null
    }

    const { hasUpdate } = game

    const layoutId = app_name + '-' + listName + '-' + layout

    return (
      <div
        style={{
          minHeight: layout === 'grid' ? 200 : 30,
          minWidth: 10
        }}
        ref={wrapperRef}
      >
        {cardVisible && (
          <motion.div
            layoutId={layoutId}
            animate={{ scale: 1, opacity: 1 }}
            initial={{
              scale: layout === 'grid' ? 0.7 : 1,
              opacity: 0
            }}
            exit={{
              opacity: 0
            }}
            transition={{ type: 'tween', delay: index * 0.03 }}
          >
            <GameCard
              key={app_name}
              hasUpdate={hasUpdate}
              buttonClick={() => handleGameCardClick?.(app_name, runner, game)}
              forceCard={layout === 'grid'}
              isRecent={isRecent}
              game={game}
              layout={layout}
            />
          </motion.div>
        )}
      </div>
    )
  }
)

export default React.memo(GamesList)
