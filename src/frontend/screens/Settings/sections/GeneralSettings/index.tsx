import { useTranslation } from 'react-i18next'
import LanguageSelector from 'frontend/components/UI/LanguageSelector'
import { ThemeSelector } from 'frontend/components/UI/ThemeSelector'
import {
  AutoUpdateGames,
  CheckUpdatesOnStartup,
  CustomWineProton,
  DefaultInstallPath,
  DefaultSteamPath,
  DisableController,
  DiscordRPC,
  DownloadProtonToSteam,
  EgsSettings,
  HideChangelogOnStartup,
  LibraryTopSection,
  MaxRecentGames,
  MaxWorkers,
  MinimizeOnGameLaunch,
  Shortcuts,
  TraySettings,
  UseDarkTrayIcon,
  UseFramelessWindow,
  WinePrefixesBasePath,
  PlaytimeSync,
  AnalyticsOptIn
} from '../../components'

export default function GeneralSettings() {
  const { t } = useTranslation()

  return (
    <div>
      <h3 className="settingSubheader">{t('settings.navbar.general')}</h3>

      <LanguageSelector />

      <ThemeSelector />

      <DefaultInstallPath />

      <WinePrefixesBasePath />

      <CustomWineProton />

      <DefaultSteamPath />

      <EgsSettings />

      <CheckUpdatesOnStartup />

      <AutoUpdateGames />

      <HideChangelogOnStartup />

      <TraySettings />

      <MinimizeOnGameLaunch />

      <UseDarkTrayIcon />

      <UseFramelessWindow />

      <Shortcuts />

      <PlaytimeSync />

      <DiscordRPC />

      <DisableController />

      <DownloadProtonToSteam />

      <AnalyticsOptIn />

      <LibraryTopSection />

      <MaxRecentGames />

      <MaxWorkers />
    </div>
  )
}
