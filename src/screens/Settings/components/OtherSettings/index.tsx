import React, { ChangeEvent, useContext } from 'react'

import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import {
  InfoBox,
  ToggleSwitch,
  SvgButton,
  SelectField,
  TextInputField
} from 'src/components/UI'
import CreateNewFolder from '@mui/icons-material/CreateNewFolder'
import { IpcRenderer } from 'electron'
import { Path } from 'src/types'
import Backspace from '@mui/icons-material/Backspace'

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
  useSteamRuntime
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

  return (
    <>
      <h3 className="settingSubheader">{t('settings.navbar.other')}</h3>
      {!isDefault && (
        <TextInputField
          label={t(
            'setting.change-target-exe',
            'Select an alternative EXE to run'
          )}
          htmlId="setinstallpath"
          value={targetExe.replaceAll("'", '')}
          placeholder={targetExe || t('box.select.exe', 'Select EXE...')}
          onChange={(event) => setTargetExe(event.target.value)}
          inputIcon={
            <>
              {!targetExe.length ? (
                <SvgButton
                  className="material-icons settings folder inputIcon"
                  onClick={async () =>
                    ipcRenderer
                      .invoke('openDialog', {
                        buttonLabel: t('box.select.button', 'Select'),
                        properties: ['openFile'],
                        title: t('box.select.exe', 'Select EXE')
                      })
                      .then(({ path }: Path) => setTargetExe(path || targetExe))
                  }
                >
                  <CreateNewFolder data-testid="setinstallpathbutton" />
                </SvgButton>
              ) : (
                <SvgButton
                  className="material-icons settings folder inputIcon"
                  onClick={() => setTargetExe('')}
                >
                  <Backspace data-testid="setEpicSyncPathBackspace" />
                </SvgButton>
              )}
            </>
          }
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
          <ToggleSwitch
            htmlId="gamemode"
            value={useGameMode}
            handleChange={toggleUseGameMode}
            title={t('setting.gamemode')}
          />
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
          <ToggleSwitch
            htmlId="mongohud"
            value={showMangohud}
            handleChange={toggleMangoHud}
            title={t('setting.mangohud')}
          />
          {isLinuxNative && (
            <ToggleSwitch
              htmlId="steamruntime"
              value={useSteamRuntime}
              handleChange={toggleUseSteamRuntime}
              title={t('setting.steamruntime', 'Use Steam Runtime')}
            />
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
