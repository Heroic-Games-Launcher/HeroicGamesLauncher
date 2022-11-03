import './index.scss'

import React, { useContext } from 'react'

import { useTranslation } from 'react-i18next'
import {
  AlternativeExe,
  AudioFix,
  AutoDXVK,
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
  Mongohud,
  OfflineMode,
  PreferedLanguage,
  PreferSystemLibs,
  ShowFPS,
  SteamRuntime,
  UseDGPU,
  WinePrefix,
  WineVersionSelector,
  WrappersTable
} from '../../components'
import ContextProvider from 'frontend/state/ContextProvider'
import Tools from '../../components/Tools'
import SettingsContext from '../../SettingsContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'

export default function GamesSettings() {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isDefault } = useContext(SettingsContext)
  const isLinux = platform === 'linux'
  const isWin = platform === 'win32'

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

      {!isWin && (
        <>
          <section>
            <h3 className="settingSubheader">
              {isLinux ? 'Wine' : 'Crossover'}
            </h3>

            <WinePrefix />

            <WineVersionSelector />

            <CrossoverBottle />

            <Tools />
          </section>

          <section>
            <h3 className="settingSubheader">
              {t('settings.navbar.wineExt', 'Wine Extensions')}
            </h3>

            <AutoDXVK />

            <AutoVKD3D />

            <EacRuntime />

            <BattlEyeRuntime />
          </section>
        </>
      )}

      <section>
        <h3 className="settingSubheader">{t('settings.navbar.other')}</h3>

        <AlternativeExe />

        <ShowFPS />

        <PreferSystemLibs />

        <EnableFSR />

        <EnableEsync />

        <EnableFsync />

        <GameMode />

        <UseDGPU />

        <AudioFix />

        <Mongohud />

        <SteamRuntime />

        <OfflineMode />

        <EnvVariablesTable />

        <WrappersTable />

        <LauncherArgs />

        <PreferedLanguage />
      </section>
    </>
  )
}
