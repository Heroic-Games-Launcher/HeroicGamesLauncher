import React from 'react'
import { Path } from '../../types';
const {
  remote: { dialog }
} = window.require("electron");

interface Props {
  defaultInstallPath: string
  setDefaultInstallPath: (value: string) => void
}

export default function GeneralSettings({defaultInstallPath, setDefaultInstallPath}: Props) {
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
                      setDefaultInstallPath(
                        filePaths[0] ? `'${filePaths[0]}'` : ""
                      )
                    )
                }
              >
                create_new_folder
              </span>
            </span>
          </span>
    </>
  )
}
