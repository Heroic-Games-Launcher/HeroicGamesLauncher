import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { WineProps, Path } from '../../types'
import InfoBox from '../UI/InfoBox'
const {
  ipcRenderer,
  remote: { dialog },
} = window.require('electron')

interface Props {
  winePrefix: string
  setWinePrefix: (value: string) => void
  setWineversion: (wine: WineProps) => void
  wineVersion: WineProps
  altWine: WineProps[]
  setAltWine: (altWine: WineProps[]) => void
}

export default function WineSettings({
  winePrefix,
  setWinePrefix,
  setWineversion,
  setAltWine,
  wineVersion,
  altWine,
}: Props) {
  useEffect(() => {
    const getAltWine = async () => {
      const wineList: WineProps[] = await ipcRenderer.invoke(
        'getAlternativeWine'
      )
      setAltWine(wineList)
    }
    getAltWine()
  }, [altWine])
  const { t } = useTranslation()

  return (
    <>
      <span className="setting">
        <span className="settingText">{t('setting.wineprefix')}</span>
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
                  title: t('box.wineprefix'),
                  buttonLabel: t('box.choose'),
                  properties: ['openDirectory'],
                })
                .then(({ filePaths }: Path) =>
                  setWinePrefix(filePaths[0] ? `${filePaths[0]}` : '~/.wine')
                )
            }
          >
            create_new_folder
          </span>
        </span>
      </span>
      <span className="setting">
        <span className="settingText">{t('setting.wineversion')}</span>
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
        <span>{t('help.wine.part1')}</span>
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
        <span>{t('help.wine.part2')}</span>
      </InfoBox>
    </>
  )
}
