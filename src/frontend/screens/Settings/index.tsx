import './index.css'

import React, { useContext, useEffect, useState } from 'react'

import { useNavigate, useParams } from 'react-router-dom'
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
  NavList,
  PageHeader,
  Tabs,
  UpdateComponent
} from 'frontend/components/UI'
import type { NavListItem } from 'frontend/components/UI/NavList'
import type { TabItem } from 'frontend/components/UI/Tabs'
import useMediaQuery from 'frontend/hooks/useMediaQuery'
import {
  Copy,
  FileText,
  Gamepad2,
  MonitorCog,
  SlidersHorizontal,
  Wrench
} from 'lucide-react'
import ContextProvider from 'frontend/state/ContextProvider'
import { SettingsContextType } from 'frontend/types'
import useSettingsContext from 'frontend/hooks/useSettingsContext'
import { hasHelp } from 'frontend/hooks/hasHelp'
import { ContentCopy, FileOpen } from '@mui/icons-material'

function Settings() {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const navigate = useNavigate()
  const isNarrow = useMediaQuery('(max-width: 1100px)')
  const isWin = platform === 'win32'

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

  const sections: TabItem<string>[] = [
    {
      value: 'general',
      label: t('settings.navbar.general'),
      glyph: SlidersHorizontal
    },
    ...(isWin
      ? []
      : [
          {
            value: 'games_settings',
            label: t(
              'settings.navbar.games_settings_defaults',
              'Game Defaults'
            ),
            glyph: Gamepad2
          }
        ]),
    {
      value: 'advanced',
      label: t('settings.navbar.advanced', 'Advanced'),
      glyph: Wrench
    },
    {
      value: 'systeminfo',
      label: t('settings.navbar.systemInformation', 'System Information'),
      glyph: MonitorCog
    },
    {
      value: 'log',
      label: t('settings.navbar.log', 'Log'),
      glyph: FileText
    }
  ]

  const navItems: NavListItem[] = sections.map(({ value, label, glyph }) => ({
    to: `/settings/${value}`,
    label,
    glyph
  }))

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
              backTo="/library"
              backLabel={t('button.backToLibrary', 'Back to Library')}
              title={pageTitle}
              description={pageDescription}
              className="headerTitle"
              actions={!isLogSettings ? copyButton : undefined}
            />

            <div className="settingsLayout">
              {isNarrow ? (
                <Tabs
                  items={sections}
                  value={type}
                  onChange={(value) => navigate(`/settings/${value}`)}
                  aria-label={t('Settings', 'Settings')}
                  className="settingsNav settingsNav--tabs"
                />
              ) : (
                <NavList
                  items={navItems}
                  className="settingsNav"
                  aria-label={t('Settings', 'Settings')}
                />
              )}
              <div className="settingsPane">
                {isGeneralSettings && <GeneralSettings />}
                {isGamesSettings && <GamesSettings />}
                {isSyncSettings && <SyncSaves />}
                {isAdvancedSetting && <AdvancedSettings />}
                {isLogSettings && <LogSettings />}
                {isSystemInfo && <SystemInfo />}
                <FooterInfo />
              </div>
            </div>
          </div>
        </div>
      </SettingsContext.Provider>
    </ContextMenu>
  )
}

export default React.memo(Settings)
