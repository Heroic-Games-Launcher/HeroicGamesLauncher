import { IpcRendererEvent } from "electron";
import React, { useEffect, useState } from "react";
import { useParams } from 'react-router-dom';
import { writeConfig } from "../helper";
import Header from "./UI/Header";

const {
  remote: { dialog },
  ipcRenderer,
} = window.require("electron");

interface WineProps {
  name: string;
  bin: string;
}

interface RouteParams {
  appName: string;
}

interface AltSettings {
  wineVersion: WineProps;
  winePrefix: string;
  otherOptions: string;
  defaultInstallPath: string;
}

interface Path {
  filePaths: string[];
}

// TODO: Refactor this component in smaller components

export default function Settings() {
  const [wineVersion, setWineversion] = useState({
    name: "Wine Default",
    bin: "/usr/bin/wine",
  } as WineProps);
  const [winePrefix, setWinePrefix] = useState("~/.wine");
  const [defaultInstallPath, setDefaultInstallPath] = useState("");
  const [otherOptions, setOtherOptions] = useState("");
  const [altWine, setAltWine] = useState([] as WineProps[]);
  const [saved, setSaved] = useState(false)

  const { appName } = useParams() as RouteParams;
  const isDefault = appName === 'default'
  const settings = isDefault ? 'defaultSettings' : appName

  useEffect(() => {
    ipcRenderer.send("requestSettings", appName);
    ipcRenderer.once(
      settings,
      (event: IpcRendererEvent, config: AltSettings) => {
        setDefaultInstallPath(config.defaultInstallPath);
        setWineversion(config.wineVersion);
        setWinePrefix(config.winePrefix);
        setOtherOptions(config.otherOptions);
        ipcRenderer.send("getAlternativeWine");
        ipcRenderer.on(
          "alternativeWine",
          (event: IpcRendererEvent, args: WineProps[]) => setAltWine(args)
        );
      }
    );
  }, [settings, appName]);

  useEffect(() => {
    // TODO: Save settings automatically
    setSaved(false)
  }, [altWine, otherOptions, defaultInstallPath, wineVersion])

  const callTools = (tool: string) =>
    ipcRenderer.send("callTool", {
      tool,
      wine: wineVersion.bin,
      prefix: winePrefix,
    });

    const GlobalSettings = {
        defaultSettings: {
          defaultInstallPath,
          wineVersion,
          winePrefix,
          otherOptions,
        },
    }

    const GameSettings = {
      [appName]: {
        wineVersion,
        winePrefix,
        otherOptions,
      },
    }

    const settingsToSave = isDefault ? GlobalSettings : GameSettings
  
    return (
    <>
      <Header renderBackButton />
      <div className="Settings">
        <div className="settingsWrapper">
          {isDefault && <span className="setting">
            <span className="settingText">Default Installation Path</span>
            <span>
              <input
                type="text"
                value={defaultInstallPath}
                className="settingSelect small"
                placeholder={"~/Games/Heroic"}
                onChange={(event) => setDefaultInstallPath(event.target.value)}
              />
              <button
                className="button settings"
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
                Choose Folder
              </button>
            </span>
          </span>}
          <span className="setting">
            <span className="settingText">Default WinePrefix</span>
            <span>
              <input
                type="text"
                value={winePrefix}
                className="settingSelect small"
                onChange={(event) => setWinePrefix(event.target.value)}
              />
              <button
                className="button settings"
                onClick={() =>
                  dialog
                    .showOpenDialog({
                      title: "Choose WinePrefix",
                      buttonLabel: "Choose",
                      properties: ["openDirectory"],
                    })
                    .then(({ filePaths }: Path) =>
                      setWinePrefix(
                        filePaths[0] ? `'${filePaths[0]}'` : "~/.wine"
                      )
                    )
                }
              >
                Choose Folder
              </button>
            </span>
          </span>
          <span className="setting">
            <span className="settingText">Default Wine Version</span>
            <select
              onChange={(event) =>
                setWineversion(
                  altWine.filter(({ name }) => name === event.target.value)[0]
                )
              }
              value={wineVersion.name}
              className="settingSelect"
            >
              {altWine.map(({ name }) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </span>
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
          <div className="settingsTools">
            <div className="buttonsWrapper">
              <button
                className="button settings"
                onClick={() => callTools("winecfg")}
              >
                Winecfg
              </button>
              <button
                className="button settings"
                onClick={() => callTools("winetricks")}
              >
                Winetricks
              </button>
            </div>
          </div>
          <div className="save">
          <button
            className="button is-success"
            onClick={() => {
              writeConfig([appName, settingsToSave])
              return setSaved(true)
            }
            }
            >
            Save Settings
          </button>
          <span className="material-icons" style={ saved ? {color: '#0BD58C', opacity: 1 } : {color: '#0BD58C', opacity: 0.4 }}>
              check_circle_outline
          </span>
          </div>
        </div>
      </div>
    </>
  );
}
