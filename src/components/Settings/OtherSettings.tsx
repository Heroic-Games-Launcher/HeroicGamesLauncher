import React from "react";
import { Path } from '../../types';

const {
  remote: { dialog }
} = window.require("electron");

interface Props {
  otherOptions: string
  setOtherOptions: (value: string) => void
  egsPath: string
  setEgsPath: (value: string) => void
}

export default function OtherSettings({otherOptions, setOtherOptions, egsPath, setEgsPath}: Props) {
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
      <span className="setting">
        <span className="settingText small">
          Sync with Installed Epic Games
        </span>
        <span>
          <input
            type="text"
            placeholder={"Choose the Epic Games Folder"}
            className="settingSelect"
            value={egsPath}
            onChange={(event) => setEgsPath(event.target.value)}
          />
          <span
            className="material-icons settings folder"
            onClick={() =>
              dialog
                .showOpenDialog({
                  title: "Choose EGS Path",
                  buttonLabel: "Choose",
                  properties: ["openDirectory"],
                })
                .then(({ filePaths }: Path) =>
                  setEgsPath(filePaths[0] ? `'${filePaths[0]}'` : "")
                )
            }
          >
            folder_open
          </span>
        </span>
      </span>
    </>
  );
}
