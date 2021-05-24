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
  const { filter, libraryStatus, layout, gameUpdates } = useContext(ContextProvider)
  const hasDownloads = libraryStatus.filter(
    (game) => game.status === 'installing' || game.status === 'updating'
  ).length
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
              data-testid="all"
              className={filter === 'all' ? 'selected' : ''}
              onClick={() => handleFilter('all')}
            >
              {t('All')}
            </span>
            <span
              data-testid="installed"
              className={filter === 'installed' ? 'selected' : ''}
              onClick={() => handleFilter('installed')}
            >
              {t('Ready')}
            </span>
            <span
              data-testid="uninstalled"
              className={filter === 'uninstalled' ? 'selected' : ''}
              onClick={() => handleFilter('uninstalled')}
            >
              {t('Not Ready')}
            </span>
            {!!hasDownloads && <span
              data-testid="downloading"
              className={filter === 'downloading' ? 'selected' : ''}
              onClick={() => handleFilter('downloading')}
            >
              {`${t('Downloading')} (${hasDownloads})`}
            </span>}
            {!!hasUpdates && <span
              data-testid="updates"
              className={filter === 'updates' ? 'selected' : ''}
              onClick={() => handleFilter('updates')}
            >
              {`${t('Updates', 'Updates')} (${hasUpdates})`}
            </span>}
            <span
              data-testid="unreal"
              className={filter === 'unreal' ? 'selected' : ''}
              onClick={() => handleFilter('unreal')}
            >
              {t('Unreal Marketplace')}
            </span>
          </span>
        )}
        {numberOfGames !== undefined && numberOfGames > 0 && (
          <span className="totalGamesText" data-testid="totalGamesText">
            {t('Total Games')}: {numberOfGames}
          </span>
        )}
        {numberOfGames !== undefined && numberOfGames === 0 && (
          <div className="totalGamesText" data-testid="totalGamesText">{t('nogames')}</div>
        )}
        {title && <div className="headerTitle" data-testid="headerTitle">{title}</div>}
        {handleLayout && (
          <div className="layoutSelection">
            <Apps
              data-testid="grid"
              className={
                layout === 'grid'
                  ? 'selectedLayout material-icons'
                  : 'material-icons'
              }
              onClick={() => handleLayout('grid')}
            />
            <List
              data-testid="list"
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
