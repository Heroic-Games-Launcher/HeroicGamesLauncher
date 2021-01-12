import React from "react";
import { Path } from "../../types";
const {
  remote: { dialog },
} = window.require("electron");

interface Props {
  defaultInstallPath: string;
  setDefaultInstallPath: (value: string) => void;
  egsPath: string;
  setEgsPath: (value: string) => void;
}

export default function GeneralSettings({
  defaultInstallPath,
  setDefaultInstallPath,
  egsPath,
  setEgsPath,
}: Props) {
  return (
    <>
      <span className="setting">
        <span className="settingText">Default Installation Path</span>
        <span>
          <input
            type="text"
            value={defaultInstallPath}
            className="settingSelect"
            placeholder={"~/Games/Heroic"}
            onChange={(event) => setDefaultInstallPath(event.target.value)}
          />
          <span
            className="material-icons settings folder"
            onClick={() =>
              dialog
                .showOpenDialog({
                  title: "Choose Default Instalation Folder",
                  buttonLabel: "Choose",
                  properties: ["openDirectory"],
                })
                .then(({ filePaths }: Path) =>
                  setDefaultInstallPath(filePaths[0] ? `'${filePaths[0]}'` : "")
                )
            }
          >
            create_new_folder
          </span>
        </span>
        </span>
        <span className="setting">
          <span className="settingText">
            Sync with Installed Epic Games
          </span>
          <span>
            <input
              type="text"
              placeholder={"Choose the Epic Games Folder"}
              className="settingSelect small"
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
