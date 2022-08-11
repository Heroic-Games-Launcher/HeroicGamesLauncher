import React, { useContext } from 'react'
import FormControl from '../FormControl'
import { useTranslation } from 'react-i18next'
import cx from 'classnames'
import { faApple, faLinux, faWindows } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { UE_VERSIONS } from './constants'
import ContextProvider from 'src/state/ContextProvider'
import './index.css'

export default function PlatformFilter() {
  const { t } = useTranslation()
  const {
    category,
    filter,
    handleFilter,
    filterPlatform,
    handlePlatformFilter,
    platform
  } = useContext(ContextProvider)

  const isMac = platform === 'darwin'
  const isLinux = platform === 'linux'
  return (
    <>
      {category !== 'unreal' && (
        <div className="platformFilters">
          {(isMac || (isLinux && category !== 'legendary')) && (
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
    </>
  )
}
