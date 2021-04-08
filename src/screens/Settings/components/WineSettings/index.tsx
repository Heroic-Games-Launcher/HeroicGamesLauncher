import React, { useEffect, useState } from 'react'

import { Path, WineInstallation } from 'src/types'
import { useTranslation } from 'react-i18next'
import InfoBox from 'src/components/UI/InfoBox'
import ToggleSwitch from 'src/components/UI/ToggleSwitch'

import AddBoxIcon from '@material-ui/icons/AddBox'
import CreateNewFolder from '@material-ui/icons/CreateNewFolder'
import RemoveCircleIcon from '@material-ui/icons/RemoveCircle'

const {
  ipcRenderer,
  remote: { dialog }
} = window.require('electron')

interface Props {
  altWine: WineInstallation[]
  autoInstallDxvk: boolean
  customWinePaths: string[]
  isDefault: boolean
  setAltWine: (altWine: WineInstallation[]) => void
  setCustomWinePaths: (value: string[]) => void
  setWinePrefix: (value: string) => void
  setWineVersion: (wine: WineInstallation) => void
  toggleAutoInstallDxvk: () => void
  winePrefix: string
  wineVersion: WineInstallation
}

export default function WineSettings({
  winePrefix,
  setWinePrefix,
  setWineVersion,
  setAltWine,
  wineVersion,
  altWine,
  toggleAutoInstallDxvk,
  autoInstallDxvk,
  customWinePaths,
  setCustomWinePaths,
  isDefault
}: Props) {
  const [selectedPath, setSelectedPath] = useState('')

  useEffect(() => {
    const getAltWine = async () => {
      const wineList: WineInstallation[] = await ipcRenderer.invoke(
        'getAlternativeWine'
      )
      setAltWine(wineList)
    }
    getAltWine()
    setSelectedPath(customWinePaths.length ? customWinePaths[0] : '')
  }, [customWinePaths])

  const { t } = useTranslation()

  function selectCustomPath() {
    dialog
      .showOpenDialog({
        buttonLabel: t('box.choose'),
        properties: ['openFile'],
        title: t('box.customWine', 'Select the Wine or Proton Binary')
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
                  buttonLabel: t('box.choose'),
                  properties: ['openDirectory'],
                  title: t('box.wineprefix')
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
                  cursor: selectedPath ? 'pointer' : ''
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
            setWineVersion(
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
