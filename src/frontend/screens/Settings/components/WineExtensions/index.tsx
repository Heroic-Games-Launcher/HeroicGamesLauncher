import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import BattlEyeRuntime from './BattlEyeRuntime'
import EacRuntime from './EacRuntime'
import AutoDXVK from './AutoDXVK'
import AutoVKD3D from './AutoVKD3D'
import useSetting from 'frontend/hooks/useSetting'
import { WineInstallation } from 'common/types'
import { defaultWineVersion } from '../WineSettings'
import classNames from 'classnames'
import SettingsContext from '../../SettingsContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'

export default function WineExtensions() {
  const { t } = useTranslation()
  const [wineVersion] = useSetting<WineInstallation>(
    'wineVersion',
    defaultWineVersion
  )
  const { appName, runner } = useContext(SettingsContext)

  if (wineVersion.type === 'bottles') {
    return (
      <>
        <h3 className="settingsSubheader">
          {t('settings.navbar.wineExt', 'Wine Extensions')}
        </h3>

        <div className="infoBox saves-warning">
          <FontAwesomeIcon icon={faExclamationTriangle} color={'yellow'} />
          {t(
            'settings.wineExt.bottlesInformation',
            'You can configure things like DXVK, VKD3D and more, in Bottles UI'
          )}
        </div>

        <button
          className={classNames('button outline bottles-button')}
          onClick={async () =>
            window.api.callTool({ tool: 'bottles', appName, runner })
          }
        >
          {t('settings.openBottles', 'OPEN BOTTLES')}
        </button>
      </>
    )
  }

  return (
    <>
      <h3 className="settingsSubheader">
        {t('settings.navbar.wineExt', 'Wine Extensions')}
      </h3>

      <AutoDXVK />

      <AutoVKD3D />

      <EacRuntime />

      <BattlEyeRuntime />
    </>
  )
}
