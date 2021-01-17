import React from "react";
import InfoBox from '../UI/InfoBox';
import ToggleSwitch from '../UI/ToggleSwitch';


interface Props {
  otherOptions: string
  setOtherOptions: (value: string) => void
  useGameMode: boolean
  setUseGameMode: (value: boolean) => void
  showFps: boolean
  setShowFps: (value: boolean) => void
}

export default function OtherSettings({
  otherOptions, 
  setOtherOptions, 
  useGameMode, 
  setUseGameMode, 
  showFps, 
  setShowFps
}: Props) {

  return (
    <>
      <span className="setting">
        <span className="toggleWrapper">
          Show FPS (DXVK_HUD=fps)
          <ToggleSwitch value={showFps} handleChange={() => setShowFps(!showFps)} /> 
        </span>
      </span>
      <span className="setting">
        <span className="toggleWrapper">
          Use GameMode (Feral Game Mode needs to be installed)
          <ToggleSwitch value={useGameMode} handleChange={() => setUseGameMode(!useGameMode)} /> 
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
            placeholder={"Put here other launch options"}
            className="settingSelect"
            value={otherOptions}
            onChange={(event) => setOtherOptions(event.currentTarget.value)}
          />
        </span>
      </span>
      <InfoBox>
      Type bellow any advanced options to launch the game if want, like: <strong>MANGOHUD=1</strong> to show Mangohud or <strong>PULSE_LATENCY_MSEC=60</strong> to fix audio in some games, etc.
      </InfoBox>
    </>
  );
}
