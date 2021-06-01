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
  numberOfGames?: number
  renderBackButton: boolean
  title?: string
}

export default function Header({
  renderBackButton,
  numberOfGames,
  goTo,
  title
}: Props) {
  const { t } = useTranslation()

  const {
    category,
    filter,
    gameUpdates,
    layout,
    libraryStatus,
    handleCategory,
    handleFilter,
    handleLayout } = useContext(ContextProvider)

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

  const ueVersions: string[] = ['4.0', '4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8',
    '4.10', '4.11', '4.12', '4.13', '4.14', '4.15', '4.16', '4.17', '4.18', '4.19', '4.20',
    '4.21', '4.22', '4.23', '4.24', '4.25', '4.26'
  ]

  function toggleCategory(newCategory: string) {
    if (category !== newCategory) {
      handleCategory(newCategory)
      handleFilter(newCategory === 'unreal' ? 'unreal' : 'all')
    }
  }

  return (
    <>
      <div className={cx({ header: !title }, { headerSettings: title })}>
        <span className="selectCategory">
          <span
            data-testid="gamesCategory"
            className={category === 'games' ? 'selected' : ''}
            onClick={() => toggleCategory('games')}
          >
            {t('Games')}
          </span>
          <span
            data-testid="unrealCategory"
            className={category === 'unreal' ? 'selected' : ''}
            onClick={() => toggleCategory('unreal')}
          >
            {t('Unreal')}
          </span>
        </span>
        {category === 'games' && (
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
          </span>
        )}
        {category === 'unreal' && (
          <span className="selectFilter">
            <span>{t('Filter')}:</span>
            <span
              data-testid="unreal"
              className={filter === 'unreal' ? 'selected' : ''}
              onClick={() => handleFilter('unreal')}
            >
              {t('All')}
            </span>
            <span
              data-testid="asset"
              className={filter === 'asset' ? 'selected' : ''}
              onClick={() => handleFilter('asset')}
            >
              {t('Assets')}
            </span>
            <span
              data-testid="plugin"
              className={filter === 'plugin' ? 'selected' : ''}
              onClick={() => handleFilter('plugin')}
            >
              {t('Plugins')}
            </span>
            <span
              data-testid="project"
              className={filter === 'project' ? 'selected' : ''}
              onClick={() => handleFilter('project')}
            >
              {t('Projects')}
            </span>
            <select
              data-testid="ueVersionSelect"
              className={filter.includes('UE_') ? 'selected' : ''}
              id='ueVersionSelect'
              onChange={(event) => handleFilter(event.target.value)}
            >
              {ueVersions.map((version: string, key) => (
                <option key={key} value={'UE_' + version}>{version}</option>
              ))}
            </select>
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
