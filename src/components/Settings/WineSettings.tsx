import React from 'react'
import { WineProps, Path } from '../../types'
import InfoBox from '../UI/InfoBox'
const {
  remote: { dialog },
} = window.require('electron')

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
  altWine,
}: Props) {
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
                  title: 'Choose WinePrefix',
                  buttonLabel: 'Choose',
                  properties: ['openDirectory'],
                })
                .then(({ filePaths }: Path) =>
                  setWinePrefix(filePaths[0] ? `'${filePaths[0]}'` : '~/.wine')
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
      <InfoBox>
        <span>
          Heroic searchs for versions of Wine and Proton on the following
          folders:
        </span>
        <ul>
          <i>
            <li>.config/heroic/Tools/wine</li>
            <li>.config/heroic/Tools/proton</li>
            <li>.local/share/Steam/compatibilitytools.d</li>
            <li>.local/share/Steam/steamapps/common</li>
            <li>.local/share/lutris/runners/wine</li>
            <li>.var/app/com.valvesoftware.Steam (Steam Flatpak)</li>
            <li>/usr/share/steam</li>
          </i>
        </ul>
        <span>
          For other places, use a symbolic link to one of these folders
        </span>
      </InfoBox>
    </>
  )
}
