import './index.scss'

import React, { useContext } from 'react'

import { useTranslation } from 'react-i18next'
import {
  AlternativeExe,
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
  EnableDXVKFpsLimit
} from '../../components'
import ContextProvider from 'frontend/state/ContextProvider'
import Tools from '../../components/Tools'
import SettingsContext from '../../SettingsContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import useSetting from 'frontend/hooks/useSetting'
import { defaultWineVersion } from '../..'
import Collapsible from 'frontend/components/UI/Collapsible/Collapsible'

type Props = {
  useDetails?: boolean
}

export default function GamesSettings({ useDetails = true }: Props) {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isDefault, gameInfo, isMacNative, isLinuxNative } =
    useContext(SettingsContext)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)
  const isLinux = platform === 'linux'
  const isWin = platform === 'win32'
  const isCrossover = wineVersion?.type === 'crossover'

  const nativeGame =
    isWin ||
    (isMacNative && gameInfo?.install.platform === 'Mac') ||
    (isLinuxNative && gameInfo?.install.platform === 'linux')

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

      {!nativeGame && (
        <>
          <Collapsible
            isOpen
            isColapsible={useDetails}
            summary={isLinux ? 'Wine' : 'Wine/Crossover'}
          >
            <WinePrefix />
            <WineVersionSelector />
            <CrossoverBottle />
            <Tools />
          </Collapsible>

          {!isCrossover && (
            <Collapsible
              isOpen={false}
              isColapsible={useDetails}
              summary={t('settings.navbar.wineExt', 'Wine Extensions')}
            >
              <AutoDXVK />
              {isLinux && (
                <>
                  <AutoVKD3D />

                  <EacRuntime />

                  <BattlEyeRuntime />
                </>
              )}
            </Collapsible>
          )}
        </>
      )}

      <Collapsible
        isOpen={isWin}
        isColapsible={useDetails}
        summary={t('settings.navbar.other')}
      >
        <AlternativeExe />

        {!nativeGame && <ShowFPS />}

        {!nativeGame && <EnableDXVKFpsLimit />}

        {isLinux && !nativeGame && (
          <>
            <PreferSystemLibs />

            <EnableEsync />

            {isLinux && (
              <>
                <EnableFsync />

                <EnableFSR />

                <GameMode />
              </>
            )}
          </>
        )}

        <UseDGPU />

        {isLinux && <Mangohud />}

        <SteamRuntime />

        <OfflineMode />

        <EnvVariablesTable />

        <WrappersTable />

        <LauncherArgs />

        <PreferedLanguage />
      </Collapsible>
    </>
  )
}
