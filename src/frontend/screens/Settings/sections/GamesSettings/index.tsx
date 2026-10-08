import './index.scss'

import { useContext, useEffect, useState } from 'react'

import { useTranslation } from 'react-i18next'
import {
  AdvertiseAvxForRosetta,
  AlternativeExe,
  AutoDXVK,
  AutoDXVKNVAPI,
  AutoVKD3D,
  BattlEyeRuntime,
  CrossoverBottle,
  EacRuntime,
  EnableEsync,
  EnableFSR,
  EnableFsync,
  EnableMsync,
  EnableWineWayland,
  EnableWoW64,
  EnvVariablesTable,
  GameMode,
  LauncherArgs,
  LaunchOptionSelector,
  Mangohud,
  OfflineMode,
  PreferedLanguage,
  PreferSystemLibs,
  ShowFPS,
  SteamRuntime,
  WinePrefix,
  WineVersionSelector,
  WrappersTable,
  EnableDXVKFpsLimit,
  IgnoreGameUpdates,
  Gamescope,
  BeforeLaunchScriptPath,
  AfterLaunchScriptPath,
  NvidiaPrime
} from '../../components'
import { Alert, SettingsCard, TabPanel, Tabs } from 'frontend/components/UI'
import type { TabItem } from 'frontend/components/UI/Tabs'
import {
  FlaskConical,
  Gauge,
  Globe,
  MonitorCog,
  Save,
  ScrollText,
  SlidersHorizontal,
  TerminalSquare,
  Wine as WineIcon
} from 'lucide-react'
import ContextProvider from 'frontend/state/ContextProvider'
import Tools from '../../components/Tools'
import SettingsContext from '../../SettingsContext'
import useSetting from 'frontend/hooks/useSetting'
import { defaultWineVersion } from '../../util'
import SyncSaves from '../SyncSaves'
import FooterInfo from '../FooterInfo'
import { GameInfo } from 'common/types'
import DisableUMU from '../../components/DisableUMU'
import VerboseLogs from '../../components/VerboseLogs'

const windowsPlatforms = ['Win32', 'Windows', 'windows']
function getStartingTab(platform: string, gameInfo?: GameInfo | null): string {
  if (!gameInfo) {
    if (platform !== 'win32') {
      return 'wine'
    }
    return 'advanced'
  }
  if (platform === 'win32') {
    return 'advanced'
  } else if (windowsPlatforms.includes(gameInfo?.install.platform || '')) {
    return 'wine'
  } else if (platform === 'darwin') {
    return 'advanced'
  } else {
    return 'other'
  }
}

export default function GamesSettings() {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isDefault, gameInfo } = useContext(SettingsContext)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)
  const [isNative, setIsNative] = useState(false)
  const isLinux = platform === 'linux'
  const isWin = platform === 'win32'
  const isMac = platform === 'darwin'
  const isCrossover = wineVersion?.type === 'crossover'
  const showCloudSavesTab =
    gameInfo?.runner === 'gog' || gameInfo?.runner === 'legendary'
  const isBrowserGame = gameInfo?.install.platform === 'Browser'
  const isSideloaded = gameInfo?.runner === 'sideload'

  function shouldShowSettings(tab: 'wine' | 'other'): boolean {
    if (tab === 'wine') {
      if (isWin || isNative || isBrowserGame) {
        return false
      }
      return true
    }

    // Other tab show on linux and mac (if not native)
    if (isLinux || (isMac && !isNative)) {
      return true
    }
    return false
  }
  // Get the latest used tab index for the current game
  const localStorageKey = gameInfo
    ? `${gameInfo.app_name}-setting_tab`
    : 'default'
  const latestTabIndex =
    localStorage.getItem(localStorageKey) || getStartingTab(platform, gameInfo)
  const [value, setValue] = useState(latestTabIndex)

  const handleChange = (newValue: string) => {
    setValue(newValue)
    // Store the latest used tab index for the current game
    localStorage.setItem(localStorageKey, newValue.toString())
  }

  useEffect(() => {
    if (gameInfo) {
      const getIsNative = async () => {
        const isNative = await window.api.isNative({
          appName: gameInfo?.app_name,
          runner: gameInfo?.runner
        })
        setIsNative(isNative)
      }
      void getIsNative()
    }
  }, [gameInfo])

  const showOtherTab = shouldShowSettings('other')
  const showWineTab = shouldShowSettings('wine')

  const settingsTabs: TabItem<string>[] = []
  if (showWineTab) settingsTabs.push({ value: 'wine', label: 'Wine' })
  if (showOtherTab)
    settingsTabs.push({
      value: 'other',
      label: t('settings.navbar.other', 'Other')
    })
  settingsTabs.push({
    value: 'advanced',
    label: t('settings.navbar.advanced', 'Advanced')
  })
  if (showCloudSavesTab)
    settingsTabs.push({
      value: 'saves',
      label: t('settings.navbar.sync', 'Cloud Saves Sync')
    })
  if (isLinux)
    settingsTabs.push({
      value: 'gamescope',
      label: t('settings.navbar.gamescope', 'Gamescope')
    })
  if (isLinux && !isNative)
    settingsTabs.push({
      value: 'legacy',
      label: t('settings.navbar.legacy', 'Legacy')
    })

  return (
    <>
      {isDefault && (
        <Alert variant="warning">
          {t(
            'settings.default_hint',
            'Changes in this section only apply as default values when installing games. If you want to change the settings of an already installed game, use the Settings button in the game page.'
          )}
        </Alert>
      )}

      <Tabs
        items={settingsTabs}
        value={value}
        onChange={handleChange}
        aria-label={t('settings.navbar.tabs', 'Settings sections')}
        className="settingsTabs"
      />

      <TabPanel value={value} index={'wine'}>
        <SettingsCard
          glyph={WineIcon}
          title={t('settings.section.wineVersion', 'Wine')}
        >
          <WineVersionSelector />
          <WinePrefix />
          <CrossoverBottle />
        </SettingsCard>
        {!isCrossover && (
          <>
            <SettingsCard
              glyph={MonitorCog}
              title={t('settings.section.graphics', 'Graphics & Translation')}
            >
              <AutoDXVK />
              {isLinux && (
                <>
                  {!window.isSteamDeck && <AutoDXVKNVAPI />}
                  <AutoVKD3D />
                </>
              )}
              <EnableFSR />
              {isMac && <EnableDXVKFpsLimit />}
            </SettingsCard>
            <SettingsCard
              glyph={SlidersHorizontal}
              title={t('settings.section.winePerformance', 'Performance')}
            >
              <EnableEsync />
              <EnableFsync />
              <EnableWineWayland />
              <EnableWoW64 />
              <EnableMsync />
              <AdvertiseAvxForRosetta />
            </SettingsCard>
            <SettingsCard
              glyph={FlaskConical}
              title={t('settings.section.wineTools', 'Tools')}
            >
              <Tools />
            </SettingsCard>
          </>
        )}
      </TabPanel>

      <TabPanel value={value} index={'other'}>
        <SettingsCard
          glyph={Gauge}
          title={t('settings.section.performance', 'Performance & Overlays')}
        >
          {!isNative && <ShowFPS />}
          <Mangohud />
          <GameMode />
          <NvidiaPrime />
        </SettingsCard>
        <SettingsCard
          glyph={MonitorCog}
          title={t('settings.section.runtimes', 'Runtimes')}
        >
          {isLinux && <PreferSystemLibs />}
          <SteamRuntime />
          {!isNative && (
            <>
              <BattlEyeRuntime />
              <EacRuntime />
            </>
          )}
        </SettingsCard>
      </TabPanel>

      <TabPanel value={value} index={'advanced'}>
        <SettingsCard
          glyph={SlidersHorizontal}
          title={t('settings.section.launch', 'Launch Options')}
        >
          {!isSideloaded && (
            <>
              <IgnoreGameUpdates />
              <OfflineMode />
            </>
          )}
          <VerboseLogs />
          <AlternativeExe />
          <LaunchOptionSelector />
          <LauncherArgs />
        </SettingsCard>
        <SettingsCard
          glyph={ScrollText}
          title={t('setting.scripts', 'Scripts')}
        >
          <BeforeLaunchScriptPath />
          <AfterLaunchScriptPath />
        </SettingsCard>
        <SettingsCard
          glyph={TerminalSquare}
          title={t('settings.section.environment', 'Wrapper & Environment')}
        >
          <WrappersTable />
          <EnvVariablesTable />
        </SettingsCard>
        {!isSideloaded && (
          <SettingsCard
            glyph={Globe}
            title={t('settings.section.language', 'Language & Region')}
          >
            <PreferedLanguage />
          </SettingsCard>
        )}
      </TabPanel>

      <TabPanel value={value} index={'saves'}>
        <SettingsCard
          glyph={Save}
          title={t('settings.navbar.sync', 'Cloud Saves Sync')}
        >
          <SyncSaves />
        </SettingsCard>
      </TabPanel>

      <TabPanel value={value} index={'gamescope'}>
        <Gamescope />
      </TabPanel>

      {isLinux && (
        <TabPanel value={value} index={'legacy'}>
          <Alert variant="warning">
            {t(
              'settings.legacy_warning',
              'Warning: The settings on this tab are mostly deprecated and might not work at all.'
            )}
          </Alert>
          <EnableDXVKFpsLimit />
          <DisableUMU />
        </TabPanel>
      )}

      {!isDefault && <FooterInfo />}
    </>
  )
}
