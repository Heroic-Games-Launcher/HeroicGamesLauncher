import './index.scss'

import React, { useContext, useEffect, useState } from 'react'

import { useTranslation } from 'react-i18next'
import {
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
  EnvVariablesTable,
  GameMode,
  LauncherArgs,
  Mangohud,
  OfflineMode,
  PreferedLanguage,
  PreferSystemLibs,
  ShowFPS,
  SteamRuntime,
  UseDGPU,
  WinePrefix,
  WineVersionSelector,
  WrappersTable,
  EnableDXVKFpsLimit,
  IgnoreGameUpdates
} from '../../components'
import ContextProvider from 'frontend/state/ContextProvider'
import Tools from '../../components/Tools'
import SettingsContext from '../../SettingsContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import useSetting from 'frontend/hooks/useSetting'
import { defaultWineVersion } from '../..'
import SyncSaves from '../SyncSaves'
import FooterInfo from '../FooterInfo'
import { Tabs, Tab } from '@mui/material'
import { GameInfo } from 'common/types'

type TabPanelProps = {
  children?: React.ReactNode
  index: string
  value: string
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <div>{children}</div>}
    </div>
  )
}

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
  const isCrossover = wineVersion?.type === 'crossover'
  const hasCloudSaves =
    gameInfo?.cloud_save_enabled && gameInfo.install.platform !== 'linux'
  const isBrowserGame = gameInfo?.install.platform === 'Browser'
  const isSideloaded = gameInfo?.runner === 'sideload'

  function shouldShowSettings(tab: 'wine' | 'other'): boolean {
    if (tab === 'wine') {
      if (isWin || isNative || isBrowserGame) {
        return false
      }
      return true
    }

    if (isLinux) {
      return true
    }
    return false
  }

  // Get the latest used tab index for the current game
  const localStorageKey = gameInfo
    ? `${gameInfo!.app_name}-setting_tab`
    : 'default'
  const latestTabIndex =
    localStorage.getItem(localStorageKey) || getStartingTab(platform, gameInfo)
  const [value, setValue] = useState(latestTabIndex)

  const handleChange = (
    event: React.ChangeEvent<unknown>,
    newValue: string
  ) => {
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
      getIsNative()
    }
  }, [])

  const showOtherTab = shouldShowSettings('other')
  const showWineTab = shouldShowSettings('wine')

  return (
    <>
      {isDefault && (
        <p className="defaults-hint">
          <FontAwesomeIcon icon={faInfoCircle} />
          {t(
            'settings.default_hint',
            'Changes in this section only apply as default values when installing games. If you want to change the settings of an already installed game, use the Settings button in the game page.'
          )}
        </p>
      )}

      <Tabs
        value={value}
        onChange={handleChange}
        aria-label="settings tabs"
        variant="scrollable"
      >
        {showWineTab && <Tab label="Wine" value="wine" />}
        {showOtherTab && (
          <Tab label={t('settings.navbar.other', 'Other')} value="other" />
        )}
        <Tab
          label={t('settings.navbar.advanced', 'Advanced')}
          value="advanced"
        />

        {hasCloudSaves && (
          <Tab
            label={t('settings.navbar.sync', 'Cloud Saves Sync')}
            value="saves"
          />
        )}
      </Tabs>

      <TabPanel value={value} index={'wine'}>
        <WineVersionSelector />
        <WinePrefix />
        <CrossoverBottle />
        {!isCrossover && (
          <>
            <AutoDXVK />
            {isLinux && (
              <>
                <AutoDXVKNVAPI />
                <AutoVKD3D />
              </>
            )}
            <EnableEsync />
            <EnableFsync />
            <EnableFSR />
            <EnableDXVKFpsLimit />
            <Tools />
          </>
        )}
      </TabPanel>

      <TabPanel value={value} index={'other'}>
        {!isNative && <ShowFPS />}
        <Mangohud />
        <GameMode />
        <PreferSystemLibs />
        <SteamRuntime />
        <UseDGPU />
        {!isNative && (
          <>
            <BattlEyeRuntime />
            <EacRuntime />
          </>
        )}
      </TabPanel>

      <TabPanel value={value} index={'advanced'}>
        {!isSideloaded && (
          <>
            <IgnoreGameUpdates />
            <OfflineMode />
          </>
        )}
        <AlternativeExe />
        <LauncherArgs />
        <WrappersTable />
        <EnvVariablesTable />
        {!isSideloaded && <PreferedLanguage />}
      </TabPanel>

      <TabPanel value={value} index={'saves'}>
        <SyncSaves />
      </TabPanel>

      {!isDefault && <FooterInfo />}
    </>
  )
}
