import { IpcRendererEvent } from "electron";
import React, { useEffect, useState } from "react";
import { NavLink, useParams } from 'react-router-dom';
import { writeConfig } from "../../helper";
import { WineProps } from '../../types';
import Header from "../UI/Header";
import GeneralSettings from './GeneralSettings';
import OtherSettings from './OtherSettings';
import Tools from './Tools';
import WineSettings from './WineSettings';

const {
  ipcRenderer,
} = window.require("electron");

interface RouteParams {
  appName: string;
  type: string;
}

interface AltSettings {
  wineVersion: WineProps;
  winePrefix: string;
  otherOptions: string;
  defaultInstallPath: string;
}

// TODO: add option to add Custom wine
// TODO: add feedback when launching winecfg and winetricks
// TODO: Sync saves with installed EGS

export default function Settings() {
  const [wineVersion, setWineversion] = useState({
    name: "Wine Default",
    bin: "/usr/bin/wine",
  } as WineProps);
  const [winePrefix, setWinePrefix] = useState("~/.wine");
  const [defaultInstallPath, setDefaultInstallPath] = useState("");
  const [otherOptions, setOtherOptions] = useState("");
  const [egsPath, setEgsPath] = useState("");
  const [altWine, setAltWine] = useState([] as WineProps[]);

  const { appName, type } = useParams() as RouteParams;
  const isDefault = appName === 'default'
  const isGeneralSettings = type === 'general'
  const isWineSettings = type === 'wine'
  const isOtherSettings = type === 'other'

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
  }, [appName, settings, type]);

  console.log(type, appName);
  

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

    useEffect(() => {
      writeConfig([appName, settingsToSave])
    }, [winePrefix, defaultInstallPath, altWine, otherOptions, appName, settingsToSave])
  
    return (
    <>
      <Header renderBackButton />
      <div className="Settings">
        <div className='settingsNavbar'>
          {isDefault && 
            <NavLink activeStyle={{ color: '#07C5EF', fontWeight: 500 }} to={{  
              pathname: '/settings/default/general'
            }}>General
          </NavLink>}
          <NavLink activeStyle={{ color: '#07C5EF', fontWeight: 500 }} to={{  
              pathname: `/settings/${appName}/wine`
            }}>Wine
          </NavLink>
          <NavLink activeStyle={{ color: '#07C5EF', fontWeight: 500 }} to={{  
              pathname: `/settings/${appName}/other`
            }}>Other
          </NavLink>
        </div>
        <div className="settingsWrapper">
          {isGeneralSettings &&
            <GeneralSettings 
              egsPath={egsPath} 
              setEgsPath={setEgsPath} 
              defaultInstallPath={defaultInstallPath} 
              setDefaultInstallPath={setDefaultInstallPath}
            />          
          }
          {isWineSettings && 
          <WineSettings 
            altWine={altWine}
            wineVersion={wineVersion}
            winePrefix={winePrefix}
            setWineversion={setWineversion}
            setWinePrefix={setWinePrefix}
          />}
          {isOtherSettings && 
          <OtherSettings 
            otherOptions={otherOptions} 
            setOtherOptions={setOtherOptions} 
          />}
          {isWineSettings && 
          <Tools 
            winePrefix={winePrefix}
            wineVersion={wineVersion}
          />}
          <div className="save">
          <span style={ {color: '#0BD58C', opacity: 1 }}>
              Settings are saved automatically
          </span>
          </div>
        </div>
      </div>
    </>
  );
}
