import React, { useState } from "react";
import { Path } from "../../types";
const {
  ipcRenderer,
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
  const [isSyncing, setIsSyncing] = useState(false);

  async function handleSync() {
    setIsSyncing(true);
    await ipcRenderer
      .invoke("egsSync", egsPath)
      .then((res: string) =>
        dialog.showMessageBox({ title: "EGS Sync", message: res })
      );
    setIsSyncing(false);
  }

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
        <span className="settingText">Sync with Installed Epic Games</span>
        <span>
          <input
            type="text"
            placeholder={"Prefix where EGS is installed"}
            className="settingSelect small"
            value={egsPath}
            onChange={(event) => setEgsPath(event.target.value)}
          />
          {!Boolean(egsPath.length) ? (
            <span
              className="material-icons settings folder"
              onClick={() =>
                dialog
                  .showOpenDialog({
                    title: "Choose Prefix where EGS is installed",
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
          ) : (
            <span
              className="material-icons settings folder"
              onClick={() => setEgsPath("")}
              style={{ color: "#1D1F1F" }}
            >
              backspace
            </span>
          )}
          <button
            onClick={() => handleSync()}
            disabled={isSyncing || !Boolean(egsPath.length)}
            className={`button is-small ${
              isSyncing ? "is-primary" : "settings"
            }`}
          >
            {`${isSyncing ? "Syncing" : "Sync"}`}
          </button>
        </span>
      </span>
    </>
  );
}
