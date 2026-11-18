import './index.css'

import React, { useContext, useEffect, useState } from 'react'

import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import ContextMenu from '../Library/components/ContextMenu'
import SettingsContext from './SettingsContext'
import SettingsSearch from './components/SettingsSearch'
import type { ResolvedSettingsSearchEntry } from './search'
import LogSettings from './sections/LogSettings'
import FooterInfo from './sections/FooterInfo'
import {
  GeneralSettings,
  GamesSettings,
  GamepadSettings,
  RunnersSettings,
  SyncSaves,
  AdvancedSettings,
  SystemInfo,
  ImportExportSettings
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
  ArchiveRestore,
  Boxes,
  Copy,
  FileText,
  Gamepad2,
  Joystick,
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
  const [searchTarget, setSearchTarget] =
    useState<ResolvedSettingsSearchEntry | null>(null)

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
  const isGamepadSettings = type === 'gamepad'
  const isRunnersSettings = type === 'runners'
  const isLogSettings = type === 'log'
  const isAdvancedSetting = type === 'advanced'
  const isSystemInfo = type === 'systeminfo'
  const isImportExport = type === 'importexport'
  const showSettingsSearch =
    isGeneralSettings ||
    isGamepadSettings ||
    isRunnersSettings ||
    isAdvancedSetting

  useEffect(() => {
    if (!searchTarget || type !== searchTarget.tab) return

    const timeout = window.setTimeout(() => {
      const rowSelector =
        '.SettingRow, .selectFieldWrapper, .Field, .customCSSField, .SettingsCard'
      const control = searchTarget.id
        ? document.getElementById(searchTarget.id)
        : null
      let row = control?.closest<HTMLElement>(rowSelector)

      if (!row) {
        const title = t(searchTarget.titleKey).trim()
        const label = Array.from(
          document.querySelectorAll<HTMLElement>(
            '.SettingRow__label, .selectFieldWrapper > label, .customCSSLabel, .SettingsCard__title'
          )
        ).find((element) => element.textContent?.trim() === title)
        row = label?.closest<HTMLElement>(rowSelector)
      }

      if (row) {
        row.scrollIntoView({
          block: 'center',
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 'auto'
            : 'smooth'
        })
        row.classList.add('SettingsSearchTarget')
        const focusable =
          row.querySelector<HTMLElement>('[role="combobox"]') ??
          control ??
          row.querySelector<HTMLElement>('input, select, textarea, button')
        focusable?.focus({ preventScroll: true })
        window.setTimeout(
          () => row?.classList.remove('SettingsSearchTarget'),
          2000
        )
      }

      setSearchTarget(null)
    }, 60)

    return () => window.clearTimeout(timeout)
  }, [searchTarget, type, t])

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
      ? t('settings.navbar.games_settings_defaults', 'Game defaults')
      : isRunnersSettings
        ? t('settings.navbar.runners', 'Runners')
        : isGamepadSettings
          ? t('settings.navbar.gamepad', 'Gamepad')
          : isAdvancedSetting
          ? t('settings.navbar.advanced', 'Advanced')
          : isSystemInfo
            ? t('settings.navbar.systemInformation', 'System information')
            : isLogSettings
              ? t('settings.navbar.log', 'Log')
              : isImportExport
                ? t('settings.navbar.importExport', 'Import / Export')
                : t('settings.navbar.sync', 'Sync')

  const pageDescription = isGeneralSettings
    ? t('settings.pageSubtitle.general', 'Configure your launcher preferences')
    : isGamesSettings
      ? t(
          'settings.pageSubtitle.games_settings_defaults',
          'Defaults applied to newly installed games'
        )
      : isRunnersSettings
        ? t(
            'settings.pageSubtitle.runners',
            'Store integrations and runner-specific options'
          )
        : isGamepadSettings
          ? t(
              'settings.pageSubtitle.gamepad',
              'Controller navigation, deadzone and button mapping'
            )
          : isAdvancedSetting
          ? t(
              'settings.pageSubtitle.advanced',
              'Behaviour, experimental features and maintenance'
            )
          : isSystemInfo
            ? t(
                'settings.pageSubtitle.systeminfo',
                'Your hardware and the versions Heroic runs'
              )
            : isLogSettings
              ? t('settings.pageSubtitle.log', 'Read and share Heroic logs')
              : isImportExport
                ? t(
                    'settings.pageSubtitle.importExport',
                    'Back up or restore your Heroic setup'
                  )
                : undefined

  const title = t('globalSettings', 'Global settings')

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
              'Game defaults'
            ),
            glyph: Gamepad2
          }
        ]),
    {
      value: 'runners',
      label: t('settings.navbar.runners', 'Runners'),
      glyph: Boxes
    },
    {
      value: 'gamepad',
      label: t('settings.navbar.gamepad', 'Gamepad'),
      glyph: Joystick
    },
    {
      value: 'advanced',
      label: t('settings.navbar.advanced', 'Advanced'),
      glyph: Wrench
    },
    {
      value: 'systeminfo',
      label: t('settings.navbar.systemInformation', 'System information'),
      glyph: MonitorCog
    },
    {
      value: 'log',
      label: t('settings.navbar.log', 'Log'),
      glyph: FileText
    },
    {
      value: 'importexport',
      label: t('settings.navbar.importExport', 'Import / Export'),
      glyph: ArchiveRestore
    }
  ]

  const navItems: NavListItem[] = sections.map(({ value, label, glyph }) => ({
    to: `/settings/${value}`,
    label,
    glyph
  }))

  const handleSearchSelect = (entry: ResolvedSettingsSearchEntry) => {
    setSearchTarget(entry)
    if (entry.tab !== type) {
      navigate(`/settings/${entry.tab}`)
    }
  }

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

  const systemInfoCopyButton = (
    <Button
      variant={isCopiedToClipboard ? 'primary' : 'ghost'}
      size="sm"
      icon={<Icon glyph={Copy} size="md" />}
      onClick={copySettingsToClipboard}
    >
      {isCopiedToClipboard
        ? t('settings.copiedToClipboard', 'Copied to clipboard!')
        : t('settings.systemInformation.copyToClipboard', 'Copy to clipboard')}
    </Button>
  )

  const settingsSearchRow = showSettingsSearch ? (
    <div className="settingsSearchRow">
      <SettingsSearch onSelect={handleSearchSelect} />
    </div>
  ) : null

  return (
    <ContextMenu
      items={[
        {
          label: t(
            'settings.copyToClipboard',
            'Copy all settings to clipboard'
          ),
          onclick: async () =>
            window.api.clipboardWriteText(
              JSON.stringify({ appName, title, ...currentConfig })
            ),
          show: !isLogSettings,
          icon: <ContentCopy />
        },
        {
          label: t('settings.open-config-file', 'Open config file'),
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
              backLabel={t('button.backToLibrary', 'Back to library')}
              title={pageTitle}
              description={pageDescription}
              className="headerTitle"
              actions={isSystemInfo ? systemInfoCopyButton : undefined}
            />

            <div className="settingsLayout">
              <div className="settingsSidebar">
                {isNarrow ? (
                  <>
                    <Tabs
                      items={sections}
                      value={type}
                      onChange={(value) => navigate(`/settings/${value}`)}
                      aria-label={t('Settings', 'Settings')}
                      className="settingsNav settingsNav--tabs"
                    />
                    {settingsSearchRow}
                  </>
                ) : (
                  <NavList
                    items={navItems}
                    className="settingsNav"
                    aria-label={t('Settings', 'Settings')}
                  />
                )}
              </div>
              <div className="settingsPane">
                {!isNarrow && settingsSearchRow}
                {isGeneralSettings && <GeneralSettings />}
                {isGamesSettings && <GamesSettings />}
                {isGamepadSettings && <GamepadSettings />}
                {isRunnersSettings && <RunnersSettings />}
                {isSyncSettings && <SyncSaves />}
                {isAdvancedSetting && (
                  <AdvancedSettings
                    copiedToClipboard={isCopiedToClipboard}
                    onCopySettings={copySettingsToClipboard}
                  />
                )}
                {isLogSettings && <LogSettings />}
                {isSystemInfo && <SystemInfo />}
                {isImportExport && <ImportExportSettings />}
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
