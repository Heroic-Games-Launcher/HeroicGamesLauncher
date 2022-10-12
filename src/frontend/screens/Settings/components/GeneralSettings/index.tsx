import React from 'react'
import { useTranslation } from 'react-i18next'
import LanguageSelector from 'frontend/components/UI/LanguageSelector'
import DefaultInstallPath from './DefaultInstallPath'
import CheckUpdatesOnStartup from './CheckUpdatesOnStartup'
import TraySettings from './TraySettings'
import MinimizeOnGameLaunch from './MinimizeOnGameLaunch'
import UseDarkTrayIcon from './UseDarkTrayIcon'
import DisableController from './DisableController'
import LibraryTopSection from './LibraryTopSection'
import MaxWorkers from './MaxWorkers'
import EgsSettings from './EgsSettings'

export default function GeneralSettings() {
  const { t } = useTranslation()

  return (
    <>
      <h3 className="settingSubheader">{t('settings.navbar.general')}</h3>

      <LanguageSelector />

      <DefaultInstallPath />

      <EgsSettings />

      <CheckUpdatesOnStartup />

      <TraySettings />

      <MinimizeOnGameLaunch />

      <UseDarkTrayIcon />

      <DisableController />

      <LibraryTopSection />

      <MaxWorkers />
    </>
  )
}
