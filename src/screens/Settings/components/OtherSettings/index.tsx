import React, {
  ChangeEvent,
  useContext
} from 'react'

import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import InfoBox from 'src/components/UI/InfoBox'
import ToggleSwitch from 'src/components/UI/ToggleSwitch'
import CreateNewFolder from '@material-ui/icons/CreateNewFolder'
import { IpcRenderer } from 'electron'
import { Path } from 'src/types'
import Backspace from '@material-ui/icons/Backspace'

const {
  ipcRenderer
} = window.require('electron') as {ipcRenderer: IpcRenderer}
interface Props {
  audioFix: boolean
  isDefault: boolean
  launcherArgs: string
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
  targetExe
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

  return (
    <>
      {!isDefault && <span className="setting">
        <span className="settingText">{t('setting.change-target-exe', 'Select an alternative EXE to run')}</span>
        <span>
          <input
            data-testid="setinstallpath"
            type="text"
            value={targetExe.replaceAll("'", '')}
            className="settingSelect"
            placeholder={targetExe || t('box.select.exe', 'Select EXE...')}
            onChange={(event) => setTargetExe(event.target.value)}
          />
          {!targetExe.length ? <CreateNewFolder
            data-testid="setinstallpathbutton"
            className="material-icons settings folder"
            onClick={() =>
              ipcRenderer.invoke('openDialog', {
                buttonLabel: t('box.select.button', 'Select'),
                filters: [ { extensions: ['exe'], name: 'Binaries' }],
                properties: ['openFile'],
                title: t('box.select.exe', 'Select EXE')
              }).then(({ path }: Path) =>
                setTargetExe(path ? `'${path}'` : targetExe)
              )
            }
          /> : (
            <Backspace
              data-testid="setEpicSyncPathBackspace"
              className="material-icons settings folder"
              onClick={() => (setTargetExe(''))}
            />
          )}
        </span>
      </span>}
      <span data-testid="otherSettings" className="setting">
        <span className="toggleWrapper">
          {t('setting.showfps')}
          <ToggleSwitch value={showFps} handleChange={toggleFps} />
        </span>
      </span>
      {isLinux && <>
        <span className="setting">
          <span className="toggleWrapper">
            {t('setting.gamemode')}
            <ToggleSwitch value={useGameMode} handleChange={toggleUseGameMode} />
          </span>
        </span>
        <span className="setting">
          <span className="toggleWrapper">
            {t('setting.primerun', 'Enable Nvidia Prime Render')}
            <ToggleSwitch value={primeRun} handleChange={togglePrimeRun} />
          </span>
        </span>
        <span className="setting">
          <span className="toggleWrapper">
            {t('setting.audiofix')}
            <ToggleSwitch value={audioFix} handleChange={toggleAudioFix} />
          </span>
        </span>
        <span className="setting">
          <span className="toggleWrapper">
            {t('setting.mangohud')}
            <ToggleSwitch value={showMangohud} handleChange={toggleMangoHud} />
          </span>
        </span>
      </>
      }
      <span className="setting">
        <span className="toggleWrapper">
          {t('setting.offlinemode')}
          <ToggleSwitch value={offlineMode} handleChange={toggleOffline} />
        </span>
      </span>
      {supportsShortcuts && isDefault && <>
        <span className="setting">
          <span className="toggleWrapper">
            {t('setting.adddesktopshortcuts', 'Add desktop shortcuts automatically')}
            <ToggleSwitch
              value={addDesktopShortcuts}
              handleChange={toggleAddDesktopShortcuts}
            />
          </span>
        </span>
        <span className="setting">
          <span className="toggleWrapper">
            {t('setting.addgamestostartmenu', 'Add games to start menu automatically')}
            <ToggleSwitch
              value={addGamesToStartMenu}
              handleChange={toggleAddGamesToStartMenu}
            />
          </span>
        </span>
      </>}
      {isDefault && <span className="setting">
        <span className="toggleWrapper">
          {t('setting.discordRPC', 'Enable Discord Rich Presence')}
          <ToggleSwitch
            value={discordRPC}
            handleChange={toggleDiscordRPC}
          />
        </span>
      </span>}
      {isDefault && <span className="setting">
        <span className="toggleWrapper">
          {t('setting.maxRecentGames', 'Recent Games to Show')}
          <select
            data-testid="setMaxRecentGames"
            onChange={(event) => setMaxRecentGames(Number(event.target.value))}
            value={maxRecentGames}
            className="settingSelect smaller"
          >
            {Array.from(Array(10).keys()).map((n) => (
              <option key={n + 1}>{n + 1}</option>
            ))}
          </select>
        </span>
      </span>}
      {!isWin && <span className="setting">
        <span className="settingText">{t('options.advanced.title')}</span>
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
      </span>}
      {!isDefault && (
        <span className="setting">
          <span className="settingText">{t('options.gameargs.title')}</span>
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
        </span>
      )}
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
    </>
  )
}
