import './index.css'

import { Link, useHistory } from 'react-router-dom'
import React, { useContext } from 'react'

import { useTranslation } from 'react-i18next'
import Apps from '@material-ui/icons/Apps'
import ArrowBack from '@material-ui/icons/ArrowBack'
import ContextProvider from 'src/state/ContextProvider'
import List from '@material-ui/icons/List'
import cx from 'classnames'

interface Props {
  goTo: string | void | null
  handleFilter?: (value: string) => void
  handleLayout?: (value: string) => void
  numberOfGames?: number
  renderBackButton: boolean
  title?: string
}

export default function Header({
  renderBackButton,
  numberOfGames,
  handleFilter,
  handleLayout,
  goTo,
  title
}: Props) {
  const { t } = useTranslation()
  const { filter, libraryStatus, layout, data, gameUpdates } = useContext(ContextProvider)
  const hasDownloads = libraryStatus.filter(
    (game) => game.status === 'installing' || game.status === 'updating'
  ).length
  const hasUEAssets = !data.filter(game => game.is_game).length

  const hasUpdates = gameUpdates.length
  const history = useHistory()

  const link = goTo ? goTo : ''
  function handleClick() {
    if (goTo) {
      return
    }
    return history.goBack()
  }

  return (
    <>
      <div className={cx({ header: !title }, { headerSettings: title })}>
        {handleFilter && (
          <span className="selectFilter">
            <span>{t('Filter')}:</span>
            <span
              className={filter === 'all' ? 'selected' : ''}
              onClick={() => handleFilter('all')}
            >
              {t('All')}
            </span>
            <span
              className={filter === 'installed' ? 'selected' : ''}
              onClick={() => handleFilter('installed')}
            >
              {t('Ready')}
            </span>
            <span
              className={filter === 'uninstalled' ? 'selected' : ''}
              onClick={() => handleFilter('uninstalled')}
            >
              {t('Not Ready')}
            </span>
            {!!hasDownloads && <span
              className={filter === 'downloading' ? 'selected' : ''}
              onClick={() => handleFilter('downloading')}
            >
              {`${t('Downloading')} ${
                hasDownloads > 0 ? `(${hasDownloads})` : ''
              }`}
            </span>}
            {!!hasUpdates && <span
              className={filter === 'updates' ? 'selected' : ''}
              onClick={() => handleFilter('updates')}
            >
              {`${t('Updates', 'Updates')} ${
                hasUpdates > 0 ? `(${hasUpdates})` : ''
              }`}
            </span>}
            {!!hasUEAssets && <span
              className={filter === 'unreal' ? 'selected' : ''}
              onClick={() => handleFilter('unreal')}
            >
              {t('Unreal Marketplace')}
            </span>}
          </span>
        )}
        {numberOfGames !== undefined && numberOfGames > 0 && (
          <span className="totalGamesText">
            {t('Total Games')}: {numberOfGames}
          </span>
        )}
        {numberOfGames !== undefined && numberOfGames === 0 && (
          <div className="totalGamesText">{t('nogames')}</div>
        )}
        {title && <div className="headerTitle">{title}</div>}
        {handleLayout && (
          <div className="layoutSelection">
            <Apps
              className={
                layout === 'grid'
                  ? 'selectedLayout material-icons'
                  : 'material-icons'
              }
              onClick={() => handleLayout('grid')}
            />
            <List
              className={
                layout === 'list'
                  ? 'selectedLayout material-icons'
                  : 'material-icons'
              }
              onClick={() => handleLayout('list')}
            ></List>
          </div>
        )}

        {renderBackButton && (
          <Link className="returnLink" to={link} onClick={handleClick}>
            <ArrowBack className="material-icons" />
            {t('Return')}
          </Link>
        )}
      </div>
    </>
  )
}
