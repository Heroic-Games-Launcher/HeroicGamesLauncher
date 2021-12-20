import './index.css'

import { Link, useHistory } from 'react-router-dom'
import React, { useContext } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSyncAlt,
  faBorderAll,
  faList
} from '@fortawesome/free-solid-svg-icons'

import { UE_VERSIONS } from './constants'
import { useTranslation } from 'react-i18next'
import ArrowBack from '@material-ui/icons/ArrowBack'
import ContextProvider from 'src/state/ContextProvider'
import SearchBar from 'src/components/UI/SearchBar'
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
    gameUpdates = [],
    libraryStatus,
    handleFilter,
    refreshLibrary,
    handleLayout,
    layout
  } = useContext(ContextProvider)

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

  if (renderBackButton) {
    return (
      <div className={cx({ header: !title }, { headerSettings: title })}>
        <Link
          data-testid="returnLink"
          className="returnLink"
          to={link}
          onClick={handleClick}
        >
          <ArrowBack className="material-icons" />
          {t('Return')}
        </Link>
        {title && (
          <div className="headerTitle" data-testid="headerTitle">
            {title}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className={cx({ header: !title }, { headerSettings: title })}>
        {category === 'games' && (
          <span className="selectFilter">
            <span>{t('Filter')}:</span>
            <select
              onChange={(e) => handleFilter(e.target.value)}
              value={filter}
              data-testid="games-filter"
            >
              <option
                data-testid="all"
                className={filter === 'all' ? 'selected' : ''}
                value="all"
              >
                {t('All')}
              </option>
              <option
                data-testid="installed"
                className={filter === 'installed' ? 'selected' : ''}
                value="installed"
              >
                {t('Ready')}
              </option>
              <option
                data-testid="uninstalled"
                className={filter === 'uninstalled' ? 'selected' : ''}
                value="uninstalled"
              >
                {t('Not Ready')}
              </option>
              {!!hasDownloads && (
                <option
                  data-testid="downloading"
                  className={filter === 'downloading' ? 'selected' : ''}
                  value="downloading"
                >
                  {`${t('Downloading')} (${hasDownloads})`}
                </option>
              )}
              {!!hasUpdates && (
                <option
                  data-testid="updates"
                  className={filter === 'updates' ? 'selected' : ''}
                  value="updates"
                >
                  {`${t('Updates', 'Updates')} (${hasUpdates})`}
                </option>
              )}
            </select>
          </span>
        )}
        {title && (
          <div className="headerTitle" data-testid="headerTitle">
            {title}
          </div>
        )}
        {category === 'unreal' && (
          <span className="selectFilter">
            <span>{t('Filter')}:</span>
            <select
              onChange={(e) => handleFilter(e.target.value)}
              defaultValue={filter}
              data-testid="games-filter"
            >
              <option data-testid="unreal" value="unreal">
                {t('All')}
              </option>
              <option data-testid="asset" value="asset">
                {t('Assets', 'Assets')}
              </option>
              <option data-testid="plugin" value="plugin">
                {t('Plugins', 'Plugins')}
              </option>
              <option data-testid="project" value="project">
                {t('Projects', 'Projects')}
              </option>
            </select>
            <select
              data-testid="ueVersionSelect"
              className={filter.includes('UE_') ? 'selected' : ''}
              id="ueVersionSelect"
              onChange={(event) => handleFilter(event.target.value)}
            >
              {UE_VERSIONS.map((version: string, key) => (
                <option key={key} value={'UE_' + version}>
                  {version}
                </option>
              ))}
            </select>
          </span>
        )}
        {numberOfGames !== undefined && numberOfGames > 0 && (
          <span className="totalGamesText" data-testid="totalGamesText">
            {t('Total Games')}: {numberOfGames}
          </span>
        )}
        <SearchBar />
        {numberOfGames !== undefined && numberOfGames === 0 && (
          <div className="totalGamesText" data-testid="totalGamesText">
            {t('nogames')}
          </div>
        )}
        <div className="headerIcons">
          <FontAwesomeIcon
            onClick={() => handleLayout('grid')}
            className={cx({ selectedLayout: layout === 'grid' })}
            icon={faBorderAll}
          />
          <FontAwesomeIcon
            onClick={() => handleLayout('list')}
            className={cx({ selectedLayout: layout === 'list' })}
            icon={faList}
          />
          <FontAwesomeIcon
            onClick={() =>
              refreshLibrary({
                checkForUpdates: true,
                fullRefresh: true,
                runInBackground: false
              })
            }
            className="refreshIcon"
            icon={faSyncAlt}
          />
        </div>
      </div>
    </>
  )
}
