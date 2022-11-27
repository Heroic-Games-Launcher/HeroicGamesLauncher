import React, { useContext } from 'react'
import FormControl from '../FormControl'
import { useTranslation } from 'react-i18next'
import cx from 'classnames'
import { faApple, faLinux, faWindows } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'
import { observer } from 'mobx-react'

const PlatformFilter: React.FC<{
  value?: string
  onChange: (val: string) => void
  category?: string
}> = ({ value, onChange, category }) => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)

  const isMac = platform === 'darwin'
  const isLinux = platform === 'linux'
  const isWindows = platform === 'win32'
  const disabledIcon = isLinux && category === 'legendary'

  if (isWindows) {
    return null
  }

  return (
    <div className="platformFilters">
      <FormControl segmented>
        <button
          onClick={() => onChange('all')}
          className={cx('FormControl__button', {
            active: value === 'all'
          })}
          title={`${t('header.platform')}: ${t('All')}`}
        >
          {t('All')}
        </button>
        <button
          onClick={() => onChange('win')}
          className={cx('FormControl__button', {
            active: value === 'win'
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
            onClick={() => onChange('mac')}
            className={cx('FormControl__button', {
              active: value === 'mac'
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
            onClick={() => onChange('linux')}
            className={cx('FormControl__button', {
              active: value === 'linux'
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
      </FormControl>
    </div>
  )
}

export default observer(PlatformFilter)
