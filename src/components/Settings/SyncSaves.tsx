import React, { useState } from "react";
import { Path } from "../../types";
import ToggleSwitch from '../UI/ToggleSwitch';

const {
  ipcRenderer,
  remote: { dialog },
} = window.require("electron");

interface Props {
  savesPath: string;
  setSavesPath: (value: string) => void;
  appName: string
  autoSyncSaves: boolean
  setAutoSyncSaves: (value: boolean) => void
}

type SyncType = "Download" | "Upload" | "Force download" | "Force upload";

export default function SyncSaves({ savesPath, setSavesPath, appName, autoSyncSaves, setAutoSyncSaves }: Props) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncType, setSyncType] = useState("Download" as SyncType);
  const isLinked = Boolean(savesPath.length);
  const syncTypes: SyncType[] = [
    "Download",
    "Upload",
    "Force download",
    "Force upload",
  ];

  async function handleSync() {
    setIsSyncing(true);
    const command = {
      Download: '--skip-upload',
      Upload: '--skip-download',
      'Force download': '--force-download',
      'Force upload': '--force-upload'
    }

    ipcRenderer.invoke('syncSaves', [command[syncType], savesPath, appName])
    .then((res: string) =>
      dialog.showMessageBox({ title: "Saves Sync", message: res })
    );
    setIsSyncing(false);
  }

  return (
    <>
      <span className="setting double">
        <span className="settingText">Select the Correct <b>Cloud Sync Folder</b> (check game description) on the Prefix where the game is Installed</span>
        <span>
          <input
            type="text"
            placeholder={"Select the exact save games folder"}
            className="settingSelect"
            value={savesPath}
            disabled={isSyncing}
            onChange={(event) => setSavesPath(event.target.value)}
          />
          {!Boolean(savesPath.length) ? (
            <span
              className="material-icons settings folder"
              style={{ color: isLinked ? "transparent" : "#B0ABB6" }}
              onClick={() =>
                isLinked
                  ? ""
                  : dialog
                      .showOpenDialog({
                        title: "Choose where to store your saves",
                        buttonLabel: "Choose",
                        properties: ["openDirectory"],
                      })
                      .then(({ filePaths }: Path) =>
                        setSavesPath(filePaths[0] ? `'${filePaths[0]}'` : "")
                      )
              }
            >
              create_new_folder
            </span>
          ) : (
            <span
              className="material-icons settings folder"
              onClick={() => (isLinked ? "" : setSavesPath(""))}
              style={
                isLinked
                  ? { pointerEvents: "none", color: "transparent" }
                  : { color: "#B0ABB6" }
              }
            >
              backspace
            </span>
          )}
        </span>
        <span style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '513px'
        }}>
          <select
            onChange={(event) => setSyncType(event.target.value as SyncType)}
            value={syncType}
            className="settingSelect small"
          >
            {syncTypes.map((name: SyncType) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <button
            onClick={() => handleSync()}
            disabled={isSyncing || !Boolean(savesPath.length)}
            className={`button is-small ${
              isSyncing ? "is-primary" : "settings"
            }`}
          >
            {`${isSyncing ? "Syncing" : "Sync"}`}
          </button>
        </span>
      </span>
      <span className="setting">
        <span className="toggleWrapper">
          Sync Saves Automatically
          <ToggleSwitch value={autoSyncSaves} handleChange={() => setAutoSyncSaves(!autoSyncSaves)} /> 
        </span>
      </span>
    </>
  );
}
