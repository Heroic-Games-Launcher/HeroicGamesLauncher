import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddBoxIcon from '@material-ui/icons/AddBox'
import RemoveCircleIcon from '@material-ui/icons/RemoveCircle'

import { WineProps, Path } from '../../types'
import CreateNewFolder from '@material-ui/icons/CreateNewFolder'
import InfoBox from '../UI/InfoBox'
import ToggleSwitch from '../UI/ToggleSwitch'
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
  autoInstallDxvk: boolean
  toggleAutoInstallDxvk: () => void
  customWinePaths: string[]
  setCustomWinePaths: (value: string[]) => void
  isDefault: boolean
}

export default function WineSettings({
  winePrefix,
  setWinePrefix,
  setWineversion,
  setAltWine,
  wineVersion,
  altWine,
  toggleAutoInstallDxvk,
  autoInstallDxvk,
  customWinePaths,
  setCustomWinePaths,
  isDefault,
}: Props) {
  const [selectedPath, setSelectedPath] = useState('')

  useEffect(() => {
    const getAltWine = async () => {
      const wineList: WineProps[] = await ipcRenderer.invoke(
        'getAlternativeWine'
      )
      setAltWine(wineList)
    }
    getAltWine()
    setSelectedPath(customWinePaths.length ? customWinePaths[0] : '')
  }, [altWine])

  const { t } = useTranslation()

  function selectCustomPath() {
    dialog
      .showOpenDialog({
        title: t('box.customWine', 'Select the Wine or Proton Binary'),
        buttonLabel: t('box.choose'),
        properties: ['openFile'],
      })
      .then(({ filePaths }: Path) => {
        if (!customWinePaths.includes(filePaths[0])) {
          setCustomWinePaths(
            filePaths[0] ? [...customWinePaths, filePaths[0]] : customWinePaths
          )
        }
      })
  }

  function removeCustomPath() {
    const newPaths = customWinePaths.filter((path) => path !== selectedPath)
    setCustomWinePaths(newPaths)
    return setSelectedPath(customWinePaths.length ? customWinePaths[0] : '')
  }

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
          <CreateNewFolder
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
          />
        </span>
      </span>
      {isDefault && (
        <span className="setting">
          <span className="settingText">
            {t('setting.customWineProton', 'Custom Wine/Proton Paths')}
          </span>
          <span className="settingInputWithButton">
            <select
              disabled={!customWinePaths.length}
              className="settingSelect"
              defaultValue={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              style={{ width: '440px' }}
            >
              {customWinePaths.map((path: string) => (
                <option key={path}>{path}</option>
              ))}
            </select>
            <div className="iconsWrapper">
              <RemoveCircleIcon
                onClick={() => removeCustomPath()}
                style={{
                  color: selectedPath ? 'var(--danger)' : 'var(--background)',
                  cursor: selectedPath ? 'pointer' : '',
                }}
                fontSize="large"
                titleAccess={t('tooltip.removepath', 'Remove Path')}
              />{' '}
              <AddBoxIcon
                onClick={() => selectCustomPath()}
                className={`is-primary`}
                style={{ color: 'var(--success)', cursor: 'pointer' }}
                fontSize="large"
                titleAccess={t('tooltip.addpath', 'Add New Path')}
              />
            </div>
          </span>
        </span>
      )}
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
      <span className="setting">
        <span className="toggleWrapper">
          {t('setting.autodxvk', 'Auto Install/Update DXVK on Prefix')}
          <ToggleSwitch
            value={autoInstallDxvk}
            handleChange={toggleAutoInstallDxvk}
          />
        </span>
      </span>
      <InfoBox text="infobox.help">
        <span>{t('help.wine.part1')}</span>
        <ul>
          <i>
            <li>~/.config/heroic/tools/wine</li>
            <li>~/.config/heroic/tools/proton</li>
            <li>~/.local/share/Steam/compatibilitytools.d</li>
            <li>~/.local/share/Steam/steamapps/common</li>
            <li>~/.local/share/lutris/runners/wine</li>
            <li>~/.var/app/com.valvesoftware.Steam (Steam Flatpak)</li>
            <li>/usr/share/steam</li>
          </i>
        </ul>
        <span>{t('help.wine.part2')}</span>
      </InfoBox>
    </>
  )
}
