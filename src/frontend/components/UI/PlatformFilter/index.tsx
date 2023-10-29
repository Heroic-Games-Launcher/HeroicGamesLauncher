import React, { useContext } from 'react'
import FormControl from '../FormControl'
import { useTranslation } from 'react-i18next'
import cx from 'classnames'
import { faApple, faLinux, faWindows } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'
import { faGlobe } from '@fortawesome/free-solid-svg-icons'
import LibraryContext from 'frontend/screens/Library/LibraryContext'

export default function PlatformFilter() {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { category, filterPlatform, handlePlatformFilter } =
    useContext(LibraryContext)

  const isMac = platform === 'darwin'
  const isLinux = platform === 'linux'
  const isWindows = platform === 'win32'
  const disabledIcon =
    (isLinux && category === 'legendary') || category === 'nile' // Amazon Games only offers Windows games

  if (isWindows) {
    return null
  }

  return (
    <div className="platformFilters">
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
            disabled={disabledIcon}
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
            disabled={disabledIcon}
          >
            <FontAwesomeIcon
              className="FormControl__segmentedFaIcon"
              icon={faLinux}
              tabIndex={-1}
            />
          </button>
        )}
        <button
          onClick={() => handlePlatformFilter('browser')}
          className={cx('FormControl__button', {
            active: filterPlatform === 'browser'
          })}
          title={`${t('header.platform')}: ${t('platforms.browser')}`}
        >
          <FontAwesomeIcon
            className="FormControl__segmentedFaIcon"
            icon={faGlobe}
            tabIndex={-1}
          />
        </button>
      </FormControl>
    </div>
  )
}
