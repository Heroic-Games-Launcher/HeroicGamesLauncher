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
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <div>{children}</div>}
    </div>
  )
}

export default function GamesSettings() {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isDefault, gameInfo } = useContext(SettingsContext)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)
  const [nativeGame, setNativeGame] = useState(false)
  const isLinux = platform === 'linux'
  const isWin = platform === 'win32'
  const isCrossover = wineVersion?.type === 'crossover'
  const hasCloudSaves =
    gameInfo?.cloud_save_enabled && gameInfo.install.platform !== 'linux'

  // Get the latest used tab index for the current game
  const localStorageKey = gameInfo
    ? `${gameInfo!.app_name}-setting_tab`
    : 'default'
  const latestTabIndex = localStorage.getItem(localStorageKey) || 'wine'
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
        setNativeGame(isNative)
      }
      getIsNative()
    }
  }, [])

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

      <Tabs value={value} onChange={handleChange} aria-label="settings tabs">
        {!isWin && !nativeGame && <Tab label="Wine" value="wine" />}
        <Tab label={t('settings.navbar.other', 'Other')} value="other" />
        {!isCrossover && !isWin && (
          <Tab
            label={t('settings.navbar.advanced', 'Advanced')}
            value="advanced"
          />
        )}
        {hasCloudSaves && (
          <Tab
            label={t('settings.navbar.sync', 'Cloud Saves Sync')}
            value="saves"
          />
        )}
      </Tabs>

      <TabPanel value={value} index={'wine'}>
        <>
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
        </>
      </TabPanel>

      <TabPanel value={value} index={'other'}>
        {!nativeGame && <ShowFPS />}
        <Mangohud />
        <GameMode />
        {!isCrossover && (
          <>
            <PreferSystemLibs />
            <SteamRuntime />
            <UseDGPU />
          </>
        )}
        {!nativeGame && (
          <>
            <BattlEyeRuntime />
            <EacRuntime />
          </>
        )}
        <IgnoreGameUpdates />
        <OfflineMode />
      </TabPanel>

      <TabPanel value={value} index={'advanced'}>
        <AlternativeExe />
        <LauncherArgs />
        <WrappersTable />
        <EnvVariablesTable />
        <PreferedLanguage />
      </TabPanel>

      <TabPanel value={value} index={'saves'}>
        <SyncSaves />
      </TabPanel>

      {!isDefault && <FooterInfo />}
    </>
  )
}
