import React, {
  ChangeEvent,
  useContext
} from 'react'

import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import InfoBox from 'src/components/UI/InfoBox'
import ToggleSwitch from 'src/components/UI/ToggleSwitch'

interface Props {
  audioFix: boolean
  isDefault: boolean
  launcherArgs: string
  offlineMode: boolean
  otherOptions: string
  primeRun: boolean
  setLauncherArgs: (value: string) => void
  setOtherOptions: (value: string) => void
  showFps: boolean
  showMangohud: boolean
  toggleAudioFix: () => void
  toggleFps: () => void
  toggleMangoHud: () => void
  toggleOffline: () => void
  togglePrimeRun: () => void
  toggleUseGameMode: () => void
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
  togglePrimeRun
}: Props) {
  const handleOtherOptions = (event: ChangeEvent<HTMLInputElement>) =>
    setOtherOptions(event.currentTarget.value)
  const handleLauncherArgs = (event: ChangeEvent<HTMLInputElement>) =>
    setLauncherArgs(event.currentTarget.value)
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'

  return (
    <>
      {!isWin && <>
        <span data-testid="otherSettings" className="setting">
          <span className="toggleWrapper">
            {t('setting.showfps')}
            <ToggleSwitch value={showFps} handleChange={toggleFps} />
          </span>
        </span>
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
