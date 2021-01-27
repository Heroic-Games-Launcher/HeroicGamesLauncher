import React, { ChangeEvent } from 'react'
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
}: Props) {
  const handleOtherOptions = (event: ChangeEvent<HTMLInputElement>) =>
    setOtherOptions(event.currentTarget.value)
  const handleLauncherArgs = (event: ChangeEvent<HTMLInputElement>) =>
    setLauncherArgs(event.currentTarget.value)

  return (
    <>
      <span className="setting">
        <span className="toggleWrapper">
          Show FPS (DXVK_HUD=fps)
          <ToggleSwitch value={showFps} handleChange={toggleFps} />
        </span>
      </span>
      <span className="setting">
        <span className="toggleWrapper">
          Use GameMode (Feral Game Mode needs to be installed)
          <ToggleSwitch value={useGameMode} handleChange={toggleUseGameMode} />
        </span>
      </span>
      <span className="setting">
        <span className="settingText">
          Advanced Options (Enviroment Variables):
        </span>
        <span>
          <input
            id="otherOptions"
            type="text"
            placeholder={'Put here other launch options'}
            className="settingSelect"
            value={otherOptions}
            onChange={handleOtherOptions}
          />
        </span>
      </span>
      <span className="setting">
        <span className="settingText">
          Game Arguments (To run after the command):
        </span>
        <span>
          <input
            id="launcherArgs"
            type="text"
            placeholder={'Put here the Launcher Arguments'}
            className="settingSelect"
            value={launcherArgs}
            onChange={handleLauncherArgs}
          />
        </span>
      </span>
      <InfoBox>
        Use the <strong>Advanced Options</strong> to be called before launching
        the game if want, like: <strong>MANGOHUD=1</strong> to show Mangohud or{' '}
        <strong>PULSE_LATENCY_MSEC=60</strong> to fix audio in some games, etc.
        Use the <strong>Game Arguments</strong> to be called after the launch
        command, for instance: <br />
        <strong> -nolauncher </strong> to skip the launcher in some games, etc.
      </InfoBox>
    </>
  )
}
