import React from "react";
import { Path } from '../../types';

const {
  remote: { dialog }
} = window.require("electron");

interface Props {
  otherOptions: string
  setOtherOptions: (value: string) => void
}

export default function OtherSettings({otherOptions, setOtherOptions}: Props) {
  return (
    <>
      <span className="setting">
        <span className="settingText">
          Other Launch Options (e.g: MANGOHUD=1 PULSE_LATENCY_MSEC=60)
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
    </>
  );
}
