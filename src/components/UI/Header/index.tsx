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
  handleCategory?: (value: string) => void
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
  handleCategory,
  goTo,
  title
}: Props) {
  const { t } = useTranslation()
  const { filter, libraryStatus, layout, category } = useContext(ContextProvider)
  const haveDownloads = libraryStatus.filter(
    (game) => game.status === 'installing' || game.status === 'updating'
  ).length
  const history = useHistory()

  const link = goTo ? goTo : ''
  function handleClick() {
    if (goTo) {
      return
    }
    return history.goBack()
  }

  function toggleCategory(newCategory: string) {
    if(handleFilter && handleCategory && category != newCategory) {
      handleCategory(newCategory)
      handleFilter(newCategory === 'unreal' ? 'unreal' : 'all')
    }
  }

  return (
    <>
      <div className={cx({ header: !title }, { headerSettings: title })}>
        {handleCategory && (
          <span className="selectCategory">
            <span
              className={category === 'games' ? 'selected' : ''}
              onClick={() => toggleCategory('games')}
            >
              {t('Games')}
            </span>
            <span
              className={category === 'unreal' ? 'selected' : ''}
              onClick={() => toggleCategory('unreal')}
            >
              {t('Unreal Marketplace')}
            </span>
          </span>
        )}
        {handleFilter && category==='games' && (
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
            <span
              className={filter === 'downloading' ? 'selected' : ''}
              onClick={() => handleFilter('downloading')}
            >
              {`${t('Downloading')} ${
                haveDownloads > 0 ? `(${haveDownloads})` : ''
              }`}
            </span>
          </span>
        )}
        {handleFilter && category==='unreal' && (
          <span className="selectFilter">
            <span>{t('Filter')}:</span>
            <span
              className={filter === 'unreal' ? 'selected' : ''}
              onClick={() => handleFilter('unreal')}
            >
              {t('All')}
            </span>
            <span
              className={filter === 'asset' ? 'selected' : ''}
              onClick={() => handleFilter('asset')}
            >
              {t('Assets')}
            </span>
            <span
              className={filter === 'plugin' ? 'selected' : ''}
              onClick={() => handleFilter('plugin')}
            >
              {t('Plugins')}
            </span>
            <span
              className={filter === 'project' ? 'selected' : ''}
              onClick={() => handleFilter('project')}
            >
              {t('Projects')}
            </span>
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
