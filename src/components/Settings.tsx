import React, { useEffect, useState } from "react";
import { writeConfig } from '../helper';
import Header from "./UI/Header";

const { remote: { dialog }, ipcRenderer } = window.require('electron')

interface AlternativeWine {
  name: string;
  bin: string;
}

export default function Settings() {
  const [wineVersion, setWineversion] = useState('Wine Default')
  const [winePrefix, setWinePrefix] = useState('~/.wine')
  const [otherOptions, setOtherOptions] = useState('')
  const [altWine, setAltWine] = useState([] as AlternativeWine[])

  useEffect(() => {
    ipcRenderer.send('getAlternativeWine')
    ipcRenderer.on('alternativeWine', (event, args) => setAltWine(args))
  }, [])

  console.log(altWine);
  
  return (
    <>
      <Header title={"Settings"} renderBackButton={false} />
      <div className="Settings">
        <div className="settingsWrapper">
          <span className="setting">
            <span className="settingText">Default Wine Version</span>
            <select 
              onChange={(event) => setWineversion(altWine.filter(({name}) => name === event.target.value)[0].bin)} 
              className="settingSelect" 
            >
              <option>Wine Default</option>
              {altWine.map(({name}) => (
                <option key={name}>{name}</option>
              ))
              }
            </select>
          </span>
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
                className="button is-success settings"
                onClick={() => dialog.showOpenDialog({
                  title: "Choose WinePrefix",
                  buttonLabel: "Choose",
                  properties: ["openDirectory"],
                }).then(({ filePaths }) => setWinePrefix(filePaths[0] ? `'${filePaths[0]}'` : "~/.wine") ) }
                >Choose Folder</button>
            </span>
          </span>
          <span className="setting">
            <span className="settingText">Other Launch Options (MANGOHUD, PULSE_LATENCY_MSEC, etc.)</span>
            <span>
              <input
                id="otherOptions"
                type="text"
                placeholder={"Put here other launch options"}
                className="settingSelect"
                onChange={(event) => setOtherOptions(event.currentTarget.value)} 
              />
            </span>
          </span>
          <button className="button is-success save" onClick={() => writeConfig({wineVersion, winePrefix, otherOptions})} >Save Settings</button>
        </div>
      </div>
    </>
  );
}
