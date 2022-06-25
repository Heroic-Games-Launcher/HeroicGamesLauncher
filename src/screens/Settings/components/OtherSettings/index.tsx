import './index.css'

import React, { ChangeEvent, useCallback, useContext } from 'react'

import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import {
  InfoBox,
  ToggleSwitch,
  SelectField,
  TextInputField,
  TextInputWithIconField
} from 'src/components/UI'
import CreateNewFolder from '@mui/icons-material/CreateNewFolder'
import { IpcRenderer } from 'electron'
import { Path } from 'src/types'
import Backspace from '@mui/icons-material/Backspace'
import { getGameInfo } from 'src/helpers'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}
interface Props {
  audioFix: boolean
  isDefault: boolean
  isMacNative: boolean
  isLinuxNative: boolean
  launcherArgs: string
  canRunOffline: boolean
  offlineMode: boolean
  otherOptions: string
  primeRun: boolean
  addDesktopShortcuts: boolean
  addGamesToStartMenu: boolean
  discordRPC: boolean
  setLauncherArgs: (value: string) => void
  setOtherOptions: (value: string) => void
  setMaxRecentGames: (value: number) => void
  setTargetExe: (value: string) => void
  showFps: boolean
  showMangohud: boolean
  maxRecentGames: number
  toggleAudioFix: () => void
  toggleFps: () => void
  toggleMangoHud: () => void
  toggleOffline: () => void
  togglePrimeRun: () => void
  toggleUseGameMode: () => void
  toggleAddDesktopShortcuts: () => void
  toggleAddGamesToStartMenu: () => void
  toggleDiscordRPC: () => void
  targetExe: string
  useGameMode: boolean
  useSteamRuntime: boolean
  toggleUseSteamRuntime: () => void
  isProton: boolean
  appName: string
}

export default function OtherSettings({
  otherOptions,
  setOtherOptions,
  useGameMode,
  toggleUseGameMode,
  showFps,
  toggleFps,
  canRunOffline,
  offlineMode,
  toggleOffline,
  launcherArgs,
  setLauncherArgs,
  audioFix,
  toggleAudioFix,
  showMangohud,
  toggleMangoHud,
  isDefault,
  primeRun,
  togglePrimeRun,
  setMaxRecentGames,
  addDesktopShortcuts,
  addGamesToStartMenu,
  toggleAddDesktopShortcuts,
  toggleAddGamesToStartMenu,
  discordRPC,
  toggleDiscordRPC,
  maxRecentGames,
  setTargetExe,
  targetExe,
  isMacNative,
  isLinuxNative,
  toggleUseSteamRuntime,
  useSteamRuntime,
  isProton,
  appName
}: Props) {
  const handleOtherOptions = (event: ChangeEvent<HTMLInputElement>) =>
    setOtherOptions(event.currentTarget.value)
  const handleLauncherArgs = (event: ChangeEvent<HTMLInputElement>) =>
    setLauncherArgs(event.currentTarget.value)
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'
  const supportsShortcuts = isWin || isLinux
  const shouldRenderFpsOption = !isMacNative && !isWin && !isLinuxNative
  const showSteamRuntime = isLinuxNative || isProton

  const info = (
    <InfoBox text="infobox.help">
      {t('help.other.part1')}
      <strong>{`${t('help.other.part2')} `}</strong>
      {t('help.other.part3')}
      <br />
      {!isDefault && (
        <span>
          {t('help.other.part4')}
          <strong>{t('help.other.part5')}</strong>
          {t('help.other.part6')}
          <strong>{` -nolauncher `}</strong>
          {t('help.other.part7')}
        </span>
      )}
    </InfoBox>
  )

  const handleTargetExe = useCallback(async () => {
    if (!targetExe.length) {
      const gameinfo = await getGameInfo(appName)

      ipcRenderer
        .invoke('openDialog', {
          buttonLabel: t('box.select.button', 'Select'),
          properties: ['openFile'],
          title: t('box.select.exe', 'Select EXE'),
          defaultPath: gameinfo.install.install_path
        })
        .then(({ path }: Path) => setTargetExe(path || targetExe))
    }
    setTargetExe('')
  }, [targetExe])

  return (
    <>
      <h3 className="settingSubheader">{t('settings.navbar.other')}</h3>
      {!isDefault && (
        <TextInputWithIconField
          label={t(
            'setting.change-target-exe',
            'Select an alternative EXE to run'
          )}
          htmlId="setinstallpath"
          value={targetExe.replaceAll("'", '')}
          placeholder={targetExe || t('box.select.exe', 'Select EXE...')}
          onChange={(event) => setTargetExe(event.target.value)}
          icon={
            !targetExe.length ? (
              <CreateNewFolder data-testid="setinstallpathbutton" />
            ) : (
              <Backspace data-testid="setEpicSyncPathBackspace" />
            )
          }
          onIconClick={handleTargetExe}
        />
      )}

      {shouldRenderFpsOption && (
        <ToggleSwitch
          htmlId="showFPS"
          value={showFps}
          handleChange={toggleFps}
          title={t('setting.showfps')}
        />
      )}
      {isLinux && (
        <>
          <div className="toggleRow">
            <ToggleSwitch
              htmlId="gamemode"
              value={useGameMode}
              handleChange={toggleUseGameMode}
              title={t('setting.gamemode')}
            />

            <FontAwesomeIcon
              className="helpIcon"
              icon={faCircleInfo}
              title={t(
                'help.gamemode',
                'Feral GameMode applies automatic and temporary tweaks to the system when running games. Enabling may improve performance.'
              )}
            />
          </div>

          <ToggleSwitch
            htmlId="primerun"
            value={primeRun}
            handleChange={togglePrimeRun}
            title={t('setting.primerun', 'Use Dedicated Graphics Card')}
          />

          <ToggleSwitch
            htmlId="audiofix"
            value={audioFix}
            handleChange={toggleAudioFix}
            title={t('setting.audiofix')}
          />

          <div className="toggleRow">
            <ToggleSwitch
              htmlId="mongohud"
              value={showMangohud}
              handleChange={toggleMangoHud}
              title={t('setting.mangohud')}
            />

            <FontAwesomeIcon
              className="helpIcon"
              icon={faCircleInfo}
              title={t(
                'help.mangohud',
                'MangoHUD is an overlay that displays and monitors FPS, temperatures, CPU/GPU load and other system resources.'
              )}
            />
          </div>

          {showSteamRuntime && (
            <div className="toggleRow">
              <ToggleSwitch
                htmlId="steamruntime"
                value={useSteamRuntime}
                handleChange={toggleUseSteamRuntime}
                title={t('setting.steamruntime', 'Use Steam Runtime')}
              />

              <FontAwesomeIcon
                className="helpIcon"
                icon={faCircleInfo}
                title={t(
                  'help.',
                  'Custom libraries provided by Steam to help run Linux and Windows (Proton) games. Enabling might improve compatibility.'
                )}
              />
            </div>
          )}
        </>
      )}
      {!isDefault && canRunOffline && (
        <ToggleSwitch
          htmlId="offlinemode"
          value={offlineMode}
          handleChange={toggleOffline}
          title={t('setting.offlinemode')}
        />
      )}
      {supportsShortcuts && isDefault && (
        <>
          <ToggleSwitch
            htmlId="shortcutsToDesktop"
            value={addDesktopShortcuts}
            handleChange={toggleAddDesktopShortcuts}
            title={t(
              'setting.adddesktopshortcuts',
              'Add desktop shortcuts automatically'
            )}
          />
          <ToggleSwitch
            htmlId="shortcutsToMenu"
            value={addGamesToStartMenu}
            handleChange={toggleAddGamesToStartMenu}
            title={t(
              'setting.addgamestostartmenu',
              'Add games to start menu automatically'
            )}
          />
        </>
      )}
      {isDefault && (
        <ToggleSwitch
          htmlId="discordRPC"
          value={discordRPC}
          handleChange={toggleDiscordRPC}
          title={t('setting.discordRPC', 'Enable Discord Rich Presence')}
        />
      )}
      {isDefault && (
        <SelectField
          label={t('setting.maxRecentGames', 'Recent Games to Show')}
          htmlId="setMaxRecentGames"
          extraClass="smaller"
          onChange={(event) => setMaxRecentGames(Number(event.target.value))}
          value={maxRecentGames.toString()}
        >
          {Array.from(Array(10).keys()).map((n) => (
            <option key={n + 1}>{n + 1}</option>
          ))}
        </SelectField>
      )}
      {!isWin && (
        <TextInputField
          label={t('options.advanced.title')}
          htmlId="otherOptions"
          placeholder={t('options.advanced.placeholder')}
          value={otherOptions}
          onChange={handleOtherOptions}
          afterInput={info}
        />
      )}
      {!isDefault && (
        <TextInputField
          label={t('options.gameargs.title')}
          htmlId="launcherArgs"
          placeholder={t('options.gameargs.placeholder')}
          value={launcherArgs}
          onChange={handleLauncherArgs}
          afterInput={info}
        />
      )}
    </>
  )
}
