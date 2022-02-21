import React, { ChangeEvent, useContext } from 'react'

import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import { InfoBox, ToggleSwitch, SvgButton } from 'src/components/UI'
import CreateNewFolder from '@mui/icons-material/CreateNewFolder'
import { IpcRenderer } from 'electron'
import { Path } from 'src/types'
import Backspace from '@mui/icons-material/Backspace'
import classNames from 'classnames'

const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}
interface Props {
  audioFix: boolean
  isDefault: boolean
  isMacNative: boolean
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
  isMacNative
}: Props) {
  const handleOtherOptions = (event: ChangeEvent<HTMLInputElement>) =>
    setOtherOptions(event.currentTarget.value)
  const handleLauncherArgs = (event: ChangeEvent<HTMLInputElement>) =>
    setLauncherArgs(event.currentTarget.value)
  const { t } = useTranslation()
  const { platform, isRTL } = useContext(ContextProvider)
  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'
  const supportsShortcuts = isWin || isLinux
  const shouldRenderFpsOption = !isMacNative && !isWin

  return (
    <>
      {!isDefault && (
        <span className="setting">
          <span className={classNames('settingText', { isRTL: isRTL })}>
            {t('setting.change-target-exe', 'Select an alternative EXE to run')}
          </span>
          <span>
            <input
              data-testid="setinstallpath"
              type="text"
              value={targetExe.replaceAll("'", '')}
              className="settingSelect"
              placeholder={targetExe || t('box.select.exe', 'Select EXE...')}
              onChange={(event) => setTargetExe(event.target.value)}
            />
            {!targetExe.length ? (
              <SvgButton
                className="material-icons settings folder"
                onClick={() =>
                  ipcRenderer
                    .invoke('openDialog', {
                      buttonLabel: t('box.select.button', 'Select'),
                      properties: ['openFile'],
                      title: t('box.select.exe', 'Select EXE')
                    })
                    .then(({ path }: Path) =>
                      setTargetExe(path ? `'${path}'` : targetExe)
                    )
                }
              >
                <CreateNewFolder data-testid="setinstallpathbutton" />
              </SvgButton>
            ) : (
              <SvgButton
                className="material-icons settings folder"
                onClick={() => setTargetExe('')}
              >
                <Backspace data-testid="setEpicSyncPathBackspace" />
              </SvgButton>
            )}
          </span>
        </span>
      )}

      {shouldRenderFpsOption && (
        <span data-testid="otherSettings" className="setting">
          <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
            <ToggleSwitch
              value={showFps}
              handleChange={toggleFps}
              title={t('setting.showfps')}
            />
            <span>{t('setting.showfps')}</span>
          </label>
        </span>
      )}
      {isLinux && (
        <>
          <span className="setting">
            <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
              <ToggleSwitch
                value={useGameMode}
                handleChange={toggleUseGameMode}
                title={t('setting.gamemode')}
              />
              <span>{t('setting.gamemode')}</span>
            </label>
          </span>
          <span className="setting">
            <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
              <ToggleSwitch
                value={primeRun}
                handleChange={togglePrimeRun}
                title={t('setting.primerun', 'Enable Nvidia Prime Render')}
              />
              <span>{t('setting.primerun', 'Enable Nvidia Prime Render')}</span>
            </label>
          </span>
          <span className="setting">
            <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
              <ToggleSwitch
                value={audioFix}
                handleChange={toggleAudioFix}
                title={t('setting.audiofix')}
              />
              <span>{t('setting.audiofix')}</span>
            </label>
          </span>
          <span className="setting">
            <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
              <ToggleSwitch
                value={showMangohud}
                handleChange={toggleMangoHud}
                title={t('setting.mangohud')}
              />
              <span>{t('setting.mangohud')}</span>
            </label>
          </span>
        </>
      )}
      {canRunOffline && (
        <span className="setting">
          <span className={classNames('toggleWrapper', { isRTL: isRTL })}>
            <ToggleSwitch
              value={offlineMode}
              handleChange={toggleOffline}
              title={t('setting.offlinemode')}
            />
            <span>{t('setting.offlinemode')}</span>
          </span>
        </span>
      )}
      {supportsShortcuts && isDefault && (
        <>
          <span className="setting">
            <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
              <ToggleSwitch
                value={addDesktopShortcuts}
                handleChange={toggleAddDesktopShortcuts}
                title={t(
                  'setting.adddesktopshortcuts',
                  'Add desktop shortcuts automatically'
                )}
              />
              <span>
                {t(
                  'setting.adddesktopshortcuts',
                  'Add desktop shortcuts automatically'
                )}
              </span>
            </label>
          </span>
          <span className="setting">
            <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
              <ToggleSwitch
                value={addGamesToStartMenu}
                handleChange={toggleAddGamesToStartMenu}
                title={t(
                  'setting.addgamestostartmenu',
                  'Add games to start menu automatically'
                )}
              />
              <span>
                {t(
                  'setting.addgamestostartmenu',
                  'Add games to start menu automatically'
                )}
              </span>
            </label>
          </span>
        </>
      )}
      {isDefault && (
        <span className="setting">
          <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
            <ToggleSwitch
              value={discordRPC}
              handleChange={toggleDiscordRPC}
              title={t('setting.discordRPC', 'Enable Discord Rich Presence')}
            />
            <span>
              {t('setting.discordRPC', 'Enable Discord Rich Presence')}
            </span>
          </label>
        </span>
      )}
      {isDefault && (
        <span className="setting">
          <label className={classNames('toggleWrapper', { isRTL: isRTL })}>
            <select
              data-testid="setMaxRecentGames"
              onChange={(event) =>
                setMaxRecentGames(Number(event.target.value))
              }
              value={maxRecentGames}
              className="settingSelect smaller is-drop-down "
            >
              {Array.from(Array(10).keys()).map((n) => (
                <option key={n + 1}>{n + 1}</option>
              ))}
            </select>
            <span>{t('setting.maxRecentGames', 'Recent Games to Show')}</span>
          </label>
        </span>
      )}
      {!isWin && (
        <span className="setting">
          <span className={classNames('settingText', { isRTL: isRTL })}>
            {t('options.advanced.title')}
          </span>
          <span>
            <input
              data-testid="otheroptions"
              id="otherOptions"
              type="text"
              placeholder={t('options.advanced.placeholder')}
              className="settingSelect"
              value={otherOptions}
              onChange={handleOtherOptions}
            />
          </span>
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
        </span>
      )}
      {!isDefault && (
        <span className="setting">
          <span className={classNames('settingText', { isRTL: isRTL })}>
            {t('options.gameargs.title')}
          </span>
          <span>
            <input
              data-testid="launcherargs"
              id="launcherArgs"
              type="text"
              placeholder={t('options.gameargs.placeholder')}
              className="settingSelect"
              value={launcherArgs}
              onChange={handleLauncherArgs}
            />
          </span>
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
        </span>
      )}
    </>
  )
}
