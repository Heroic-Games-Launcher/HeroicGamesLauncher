import React, { useContext } from 'react'
import FormControl from '../FormControl'
import { useTranslation } from 'react-i18next'
import cx from 'classnames'
import { faApple, faLinux, faWindows } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'

export default function PlatformFilter() {
  const { t } = useTranslation()
  const { category, filterPlatform, handlePlatformFilter, platform } =
    useContext(ContextProvider)

  const isMac = platform === 'darwin'
  const isLinux = platform === 'linux'
  return (
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
  )
}
