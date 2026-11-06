import { useTranslation } from 'react-i18next'
import {
  Bell,
  Download,
  FolderCog,
  Gamepad2,
  Globe,
  Monitor,
  ShieldCheck
} from 'lucide-react'
import LanguageSelector from 'frontend/components/UI/LanguageSelector'
import { ThemeSelector } from 'frontend/components/UI/ThemeSelector'
import { SettingsCard } from 'frontend/components/UI'
import {
  AutoUpdateGames,
  CheckUpdatesOnStartup,
  DefaultInstallPath,
  DefaultSteamPath,
  DisableController,
  DiscordRPC,
  EgsSettings,
  HideChangelogOnStartup,
  LibraryTopSection,
  MaxRecentGames,
  MaxWorkers,
  MinimizeOnGameLaunch,
  Shortcuts,
  StartInConsoleMode,
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
    <div className="settingsSections">
      <SettingsCard
        glyph={Monitor}
        title={t('settings.section.appearance', 'Appearance')}
      >
        <ThemeSelector />
        <UseFramelessWindow />
        <LibraryTopSection />
        <MaxRecentGames />
      </SettingsCard>

      <SettingsCard
        glyph={Globe}
        title={t('settings.section.language', 'Language & Region')}
      >
        <LanguageSelector />
      </SettingsCard>

      <SettingsCard
        glyph={FolderCog}
        title={t('settings.section.locations', 'Locations')}
      >
        <DefaultInstallPath />
        <WinePrefixesBasePath />
        <DefaultSteamPath />
        <EgsSettings />
      </SettingsCard>

      <SettingsCard
        glyph={Download}
        title={t('settings.section.downloads', 'Downloads')}
      >
        <AutoUpdateGames />
        <CheckUpdatesOnStartup />
        <MaxWorkers />
      </SettingsCard>

      <SettingsCard
        glyph={Gamepad2}
        title={t('settings.section.gameplay', 'Gameplay')}
      >
        <MinimizeOnGameLaunch />
        <DisableController />
        <PlaytimeSync />
        <Shortcuts />
      </SettingsCard>

      <SettingsCard glyph={Bell} title={t('settings.section.system', 'System')}>
        <TraySettings />
        <UseDarkTrayIcon />
        <StartInConsoleMode />
        <HideChangelogOnStartup />
      </SettingsCard>

      <SettingsCard
        glyph={ShieldCheck}
        title={t('settings.section.privacy', 'Privacy')}
      >
        <DiscordRPC />
        <AnalyticsOptIn />
      </SettingsCard>
    </div>
  )
}
