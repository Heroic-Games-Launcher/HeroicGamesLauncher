import React from 'react'
import { Path, WineProps } from '../../types'
const {
  remote: { dialog }
} = window.require("electron");

interface Props {
  winePrefix: string
  setWinePrefix: (value: string) => void
  setWineversion: (wine: WineProps) => void
  wineVersion: WineProps
  altWine: WineProps[]
}

export default function WineSettings({
    winePrefix, 
    setWinePrefix, 
    setWineversion, 
    wineVersion,
    altWine}: Props) {
  return (
    <>
      <span className="setting">
            <span className="settingText">Default WinePrefix</span>
            <span>
              <input
                type="text"
                value={winePrefix}
                className="settingSelect"
                onChange={(event) => setWinePrefix(event.target.value)}
              />
              <span
                className="material-icons settings folder"
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
                create_new_folder
              </span>
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
    </>
  )
}
