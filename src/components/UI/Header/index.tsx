import { faApple, faLinux, faWindows } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import cx from 'classnames'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { SearchBar } from 'src/components/UI'
import ContextProvider from 'src/state/ContextProvider'
import FormControl from '../FormControl'
import { UE_VERSIONS } from './constants'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import './index.css'

export interface HeaderProps {
  numberOfGames: number
}

export default function Header({ numberOfGames }: HeaderProps) {
  const { t } = useTranslation()
  const {
    category,
    filter,
    handleFilter,
    filterPlatform,
    handlePlatformFilter,
    platform,
    showHidden,
    setShowHidden
  } = useContext(ContextProvider)

  const isMac = platform === 'darwin'
  const isLinux = platform === 'linux'

  const toggleShowHidden = () => {
    setShowHidden(!showHidden)
  }

  const showHiddenTitle = showHidden
    ? t('header.ignore_hidden', 'Ignore Hidden')
    : t('header.show_hidden', 'Show Hidden')

  return (
    <div className="Header">
      {category !== 'unreal' && (
        <div className="Header__filters">
          {(isMac || (isLinux && category === 'gog')) && (
            <FormControl segmented>
              <button
                onClick={() => handlePlatformFilter('all')}
                className={cx('FormControl__button', {
                  active: filterPlatform === 'all'
                })}
                title={`${t('header.platform')}: ${t('All')}`}
              >
                {t('All')}
              </button>
              <button
                onClick={() => handlePlatformFilter('win')}
                className={cx('FormControl__button', {
                  active: filterPlatform === 'win'
                })}
                title={`${t('header.platform')}: ${t('platforms.win')}`}
              >
                <FontAwesomeIcon
                  className="FormControl__segmentedFaIcon"
                  icon={faWindows}
                  tabIndex={-1}
                />
              </button>
              {isMac && (
                <button
                  onClick={() => handlePlatformFilter('mac')}
                  className={cx('FormControl__button', {
                    active: filterPlatform === 'mac'
                  })}
                  title={`${t('header.platform')}: ${t('platforms.mac')}`}
                >
                  <FontAwesomeIcon
                    className="FormControl__segmentedFaIcon"
                    icon={faApple}
                    tabIndex={-1}
                  />
                </button>
              )}
              {isLinux && (
                <button
                  onClick={() => handlePlatformFilter('linux')}
                  className={cx('FormControl__button', {
                    active: filterPlatform === 'linux'
                  })}
                  title={`${t('header.platform')}: ${t('platforms.linux')}`}
                >
                  <FontAwesomeIcon
                    className="FormControl__segmentedFaIcon"
                    icon={faLinux}
                    tabIndex={-1}
                  />
                </button>
              )}
            </FormControl>
          )}
        </div>
      )}
      {category === 'unreal' && (
        <div className="Header__filters">
          <FormControl select>
            <select
              className="FormControl__select"
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
          </FormControl>
          <FormControl select>
            <select
              id="ueVersionSelect"
              className="FormControl__select"
              onChange={(event) => handleFilter(event.target.value)}
              data-testid="ueVersionSelect"
            >
              {UE_VERSIONS.map((version: string, key) => (
                <option key={key} value={'UE_' + version}>
                  {version}
                </option>
              ))}
            </select>
          </FormControl>
        </div>
      )}
      <div className="Header__search">
        <SearchBar />
      </div>
      <div className="Header__summary" data-testid="totalGamesText">
        {/* TODO change labels for Unreal Marketplace, maybe change "Total" to "Found" */}
        {numberOfGames !== undefined && numberOfGames > 0
          ? `${t('Total Games')}: ${numberOfGames}`
          : `${t('nogames')}`}
      </div>
      <FormControl segmented>
        <button
          className="FormControl__button"
          title={showHiddenTitle}
          onClick={toggleShowHidden}
        >
          {showHidden ? <Visibility /> : <VisibilityOff />}
        </button>
      </FormControl>
    </div>
  )
}
