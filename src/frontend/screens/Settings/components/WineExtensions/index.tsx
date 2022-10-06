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
        <button
          className={classNames('button outline')}
          onClick={() =>
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
