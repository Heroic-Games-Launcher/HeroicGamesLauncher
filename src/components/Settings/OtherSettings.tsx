import React, { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'

import InfoBox from '../UI/InfoBox'
import ToggleSwitch from '../UI/ToggleSwitch'

interface Props {
  otherOptions: string
  setOtherOptions: (value: string) => void
  useGameMode: boolean
  toggleUseGameMode: () => void
  showFps: boolean
  toggleFps: () => void
  launcherArgs: string
  setLauncherArgs: (value: string) => void
  audioFix: boolean
  toggleAudioFix: () => void
  showMangohud: boolean
  toggleMangoHud: () => void
  isDefault: boolean
}

export default function OtherSettings({
  otherOptions,
  setOtherOptions,
  useGameMode,
  toggleUseGameMode,
  showFps,
  toggleFps,
  launcherArgs,
  setLauncherArgs,
  audioFix,
  toggleAudioFix,
  showMangohud,
  toggleMangoHud,
  isDefault,
}: Props) {
  const handleOtherOptions = (event: ChangeEvent<HTMLInputElement>) =>
    setOtherOptions(event.currentTarget.value)
  const handleLauncherArgs = (event: ChangeEvent<HTMLInputElement>) =>
    setLauncherArgs(event.currentTarget.value)
  const { t } = useTranslation()

  return (
    <>
      <span className="setting">
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
      <span className="setting">
        <span className="settingText">{t('options.advanced.title')}</span>
        <span>
          <input
            id="otherOptions"
            type="text"
            placeholder={t('options.advanced.placeholder')}
            className="settingSelect"
            value={otherOptions}
            onChange={handleOtherOptions}
          />
        </span>
      </span>
      {!isDefault && (
        <span className="setting">
          <span className="settingText">{t('options.gameargs.title')}</span>
          <span>
            <input
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
