import './index.css'

import React, { useEffect, useState } from 'react'

import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import ContextMenu from '../Library/components/ContextMenu'
import SettingsContext from './SettingsContext'
import LogSettings from './sections/LogSettings'
import FooterInfo from './sections/FooterInfo'
import {
  GeneralSettings,
  GamesSettings,
  SyncSaves,
  AdvancedSettings,
  SystemInfo
} from './sections'
import { AppSettings } from 'common/types'
import {
  Button,
  Icon,
  PageHeader,
  UpdateComponent
} from 'frontend/components/UI'
import { Copy } from 'lucide-react'
import { SettingsContextType } from 'frontend/types'
import useSettingsContext from 'frontend/hooks/useSettingsContext'
import { hasHelp } from 'frontend/hooks/hasHelp'
import { ContentCopy, FileOpen } from '@mui/icons-material'

function Settings() {
  const { t } = useTranslation()

  const [currentConfig, setCurrentConfig] =
    useState<Partial<AppSettings> | null>(null)
  const [isCopiedToClipboard, setCopiedToClipboard] = useState(false)

  useEffect(() => {
    if (!isCopiedToClipboard) return
    const timer = setTimeout(() => setCopiedToClipboard(false), 3000)
    return () => clearTimeout(timer)
  }, [isCopiedToClipboard])

  const { type = 'general' } = useParams()
  const appName = 'default'
  const isGeneralSettings = type === 'general'
  const isSyncSettings = type === 'sync'
  const isGamesSettings = type === 'games_settings'
  const isLogSettings = type === 'log'
  const isAdvancedSetting = type === 'advanced'
  const isSystemInfo = type === 'systeminfo'

  // TODO: Adding this comment translation here for now to not lose the
  // translation. This should be removed from here when the help is added
  // to the SettingsModal component
  // t('help.content.settingsGame', 'Show all settings for a game.')

  const helpContent = t(
    'help.content.settingsDefault',
    'Shows all settings of Heroic and defaults for games.'
  )

  hasHelp(
    'settings',
    t('help.title.settings', 'Settings'),
    <p>{helpContent}</p>
  )

  // Load Heroic's or game's config, only if not loaded already
  useEffect(() => {
    const getSettings = async () => {
      const config = await window.api.requestAppSettings()
      setCurrentConfig(config)
    }
    getSettings()
  }, [])

  // create setting context functions
  const contextValues: SettingsContextType | null = useSettingsContext({
    appName
  })

  // render `loading` while we fetch the settings
  if (!currentConfig || !contextValues) {
    return <UpdateComponent />
  }

  const pageTitle = isGeneralSettings
    ? t('settings.navbar.general', 'General')
    : isGamesSettings
      ? t('settings.navbar.games_settings_defaults', 'Game Defaults')
      : isAdvancedSetting
        ? t('settings.navbar.advanced', 'Advanced')
        : isSystemInfo
          ? t('settings.navbar.systemInformation', 'System Information')
          : isLogSettings
            ? t('settings.navbar.log', 'Log')
            : t('settings.navbar.sync', 'Sync')

  const pageDescription = isGeneralSettings
    ? t('settings.pageSubtitle.general', 'Configure your launcher preferences')
    : isGamesSettings
      ? t(
          'settings.pageSubtitle.games_settings_defaults',
          'Defaults applied to newly installed games'
        )
      : isAdvancedSetting
        ? t(
            'settings.pageSubtitle.advanced',
            'Binaries, experimental features and maintenance'
          )
        : isSystemInfo
          ? t(
              'settings.pageSubtitle.systeminfo',
              'Your hardware and the versions Heroic runs'
            )
          : isLogSettings
            ? t('settings.pageSubtitle.log', 'Read and share Heroic logs')
            : undefined

  const title = t('globalSettings', 'Global Settings')

  const copySettingsToClipboard = () => {
    if (isSystemInfo) {
      window.api.systemInfo.copyToClipboard()
    } else {
      window.api.clipboardWriteText(
        JSON.stringify({ appName, title, ...currentConfig }, null, 2)
      )
    }
    setCopiedToClipboard(true)
  }

  const copyButton = (
    <Button
      variant={isCopiedToClipboard ? 'primary' : 'ghost'}
      size="sm"
      icon={<Icon glyph={Copy} size="md" />}
      onClick={copySettingsToClipboard}
    >
      {isCopiedToClipboard
        ? t('settings.copiedToClipboard', 'Copied to Clipboard!')
        : isSystemInfo
          ? t('settings.systemInformation.copyToClipboard', 'Copy to clipboard')
          : t('settings.copyToClipboard', 'Copy All Settings to Clipboard')}
    </Button>
  )

  return (
    <ContextMenu
      items={[
        {
          label: t(
            'settings.copyToClipboard',
            'Copy All Settings to Clipboard'
          ),
          onclick: async () =>
            window.api.clipboardWriteText(
              JSON.stringify({ appName, title, ...currentConfig })
            ),
          show: !isLogSettings,
          icon: <ContentCopy />
        },
        {
          label: t('settings.open-config-file', 'Open Config File'),
          onclick: () => window.api.showConfigFileInFolder(appName),
          show: !isLogSettings,
          icon: <FileOpen />
        }
      ]}
    >
      <SettingsContext.Provider value={contextValues}>
        <div className={`Settings ${type}`}>
          <div role="list" className="settingsWrapper">
            <PageHeader
              backTo={isGeneralSettings ? '/library' : undefined}
              backLabel={t('button.backToLibrary', 'Back to Library')}
              title={pageTitle}
              description={pageDescription}
              className="headerTitle"
              actions={!isLogSettings ? copyButton : undefined}
            />

            {isGeneralSettings && <GeneralSettings />}
            {isGamesSettings && <GamesSettings />}
            {isSyncSettings && <SyncSaves />}
            {isAdvancedSetting && <AdvancedSettings />}
            {isLogSettings && <LogSettings />}
            {isSystemInfo && <SystemInfo />}
            <FooterInfo />
          </div>
        </div>
      </SettingsContext.Provider>
    </ContextMenu>
  )
}

export default React.memo(Settings)
