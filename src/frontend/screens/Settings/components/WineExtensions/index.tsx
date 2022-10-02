import React from 'react'
import { useTranslation } from 'react-i18next'
import BattlEyeRuntime from './BattlEyeRuntime'
import EacRuntime from './EacRuntime'
import AutoDXVK from './AutoDXVK'
import AutoVKD3D from './AutoVKD3D'

export default function WineExtensions() {
  const { t } = useTranslation()

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
