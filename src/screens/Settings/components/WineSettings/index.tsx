import React, { useContext, useEffect, useState } from 'react'

import { Path, WineInstallation } from 'src/types'
import { useTranslation } from 'react-i18next'
import {
  InfoBox,
  ToggleSwitch,
  SvgButton,
  SelectField,
  TextInputField,
  TextInputWithIconField
} from 'src/components/UI'

import AddBoxIcon from '@mui/icons-material/AddBox'
import ContextProvider from 'src/state/ContextProvider'

import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import { Tooltip } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { configStore } from 'src/helpers/electronStores'

const { ipcRenderer } = window.require('electron')

interface Props {
  altWine: WineInstallation[]
  autoInstallDxvk: boolean
  autoInstallVkd3d: boolean
  customWinePaths: string[]
  isDefault: boolean
  maxSharpness: number
  enableResizableBar: boolean
  setAltWine: (altWine: WineInstallation[]) => void
  setCustomWinePaths: (value: string[]) => void
  setWineCrossoverBottle: (value: string) => void
  setWinePrefix: (value: string) => void
  setDefaultWinePrefix: (value: string) => void
  setFsrSharpness: (value: number) => void
  setWineVersion: (wine: WineInstallation) => void
  toggleAutoInstallDxvk: () => void
  toggleAutoInstallVkd3d: () => void
  toggleFSR: () => void
  toggleResizableBar: () => void
  wineCrossoverBottle: string
  defaultWinePrefix: string
  winePrefix: string
  wineVersion: WineInstallation
  enableFSR: boolean
  enableEsync: boolean
  toggleEsync: () => void
  enableFsync: boolean
  toggleFsync: () => void
}

export default function WineSettings({
  winePrefix,
  setWinePrefix,
  setWineVersion,
  setAltWine,
  wineVersion,
  altWine,
  toggleAutoInstallDxvk,
  toggleAutoInstallVkd3d,
  enableFSR,
  toggleFSR,
  autoInstallDxvk,
  autoInstallVkd3d,
  customWinePaths,
  setCustomWinePaths,
  wineCrossoverBottle,
  setWineCrossoverBottle,
  isDefault,
  setFsrSharpness,
  maxSharpness,
  enableResizableBar,
  toggleResizableBar,
  enableEsync,
  toggleEsync,
  enableFsync,
  toggleFsync,
  defaultWinePrefix,
  setDefaultWinePrefix
}: Props) {
  const [selectedPath, setSelectedPath] = useState('')
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const isProton = wineVersion.type === 'proton'
  const home = configStore.get('userHome', '')

  if (winePrefix === '') {
    winePrefix = `${home}/.wine`
  }

  useEffect(() => {
    const getAltWine = async () => {
      const wineList: WineInstallation[] = await ipcRenderer.invoke(
        'getAlternativeWine'
      )
      setAltWine(wineList)
      // Avoids not updating wine config when having one wine install only
      if (wineList && wineList.length === 1) {
        setWineVersion(wineList[0])
      }
    }
    getAltWine()
    setSelectedPath(customWinePaths.length ? customWinePaths[0] : '')
  }, [customWinePaths])

  const { t } = useTranslation()

  function selectCustomPath() {
    ipcRenderer
      .invoke('openDialog', {
        buttonLabel: t('box.choose'),
        properties: ['openFile'],
        title: t('box.customWine', 'Select the Wine or Proton Binary')
      })
      .then(({ path }: Path) => {
        if (!customWinePaths.includes(path)) {
          setCustomWinePaths(
            path ? [...customWinePaths, path] : customWinePaths
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
      <h3 className="settingSubheader">Wine</h3>

      {isLinux && isDefault && (
        <TextInputWithIconField
          htmlId="selectDefaultWinePrefix"
          label={t(
            'setting.defaultWinePrefix',
            'Set Folder for new Wine Prefixes'
          )}
          value={defaultWinePrefix}
          onChange={(event) => setDefaultWinePrefix(event.target.value)}
          icon={
            <FontAwesomeIcon
              icon={faFolderOpen}
              data-testid="addWinePrefix"
              title={t(
                'toolbox.settings.wineprefix',
                'Select a Folder for new Wine Prefixes'
              )}
            />
          }
          onIconClick={async () =>
            ipcRenderer
              .invoke('openDialog', {
                buttonLabel: t('box.choose'),
                properties: ['openDirectory'],
                title: t('box.wineprefix'),
                defaultPath: defaultWinePrefix
              })
              .then(({ path }: Path) =>
                setDefaultWinePrefix(path ? `${path}` : defaultWinePrefix)
              )
          }
        />
      )}

      {isLinux && (
        <TextInputWithIconField
          htmlId="selectWinePrefix"
          label={t('setting.wineprefix')}
          value={winePrefix}
          onChange={(event) => setWinePrefix(event.target.value)}
          icon={
            <FontAwesomeIcon
              icon={faFolderOpen}
              data-testid="addWinePrefix"
              title={t(
                'toolbox.settings.default-wineprefix',
                'Select the default prefix folder for new configs'
              )}
            />
          }
          onIconClick={async () =>
            ipcRenderer
              .invoke('openDialog', {
                buttonLabel: t('box.choose'),
                properties: ['openDirectory'],
                title: t('box.wineprefix'),
                defaultPath: defaultWinePrefix
              })
              .then(({ path }: Path) =>
                setWinePrefix(path ? `${path}` : winePrefix)
              )
          }
        />
      )}

      {isDefault && (
        <SelectField
          label={t('setting.customWineProton', 'Custom Wine/Proton Paths')}
          htmlId="selectWinePath"
          disabled={!customWinePaths.length}
          extraClass="rightButtons"
          value={selectedPath}
          onChange={(e) => setSelectedPath(e.target.value)}
          afterSelect={
            <div className="iconsWrapper rightButtons addRemoveSvgButtons">
              <SvgButton onClick={() => removeCustomPath()}>
                <Tooltip
                  title={t('tooltip.removepath', 'Remove Path') as string}
                  placement="bottom"
                  arrow
                >
                  <RemoveCircleIcon
                    data-testid="removeWinePath"
                    style={{
                      color: selectedPath
                        ? 'var(--danger)'
                        : 'var(--text-tertiary)',
                      cursor: selectedPath ? 'pointer' : ''
                    }}
                    fontSize="large"
                  />
                </Tooltip>
              </SvgButton>{' '}
              <SvgButton
                onClick={() => selectCustomPath()}
                className={`is-primary`}
              >
                <Tooltip
                  title={t('tooltip.addpath', 'Add New Path') as string}
                  placement="bottom"
                  arrow
                >
                  <AddBoxIcon
                    data-testid="addWinePath"
                    style={{ color: 'var(--success)', cursor: 'pointer' }}
                    fontSize="large"
                  />
                </Tooltip>
              </SvgButton>
            </div>
          }
        >
          {customWinePaths.map((path: string) => (
            <option key={path}>{path}</option>
          ))}
        </SelectField>
      )}

      <SelectField
        label={t('setting.wineversion')}
        htmlId="setWineVersion"
        onChange={(event) =>
          setWineVersion(
            altWine.filter(({ name }) => name === event.target.value)[0]
          )
        }
        value={wineVersion.name}
        afterSelect={
          <InfoBox text="infobox.help">
            <span>{t('help.wine.part1')}</span>
            <ul>
              <i>
                <li>~/.config/heroic/tools/wine</li>
                <li>~/.config/heroic/tools/proton</li>
                <li>~/.steam/root/compatibilitytools.d</li>
                <li>~/.steam/steamapps/common</li>
                <li>~/.local/share/lutris/runners/wine</li>
                <li>~/.var/app/com.valvesoftware.Steam (Steam Flatpak)</li>
                <li>/usr/share/steam</li>
                <li>Everywhere on the system (CrossOver Mac)</li>
                <li>/opt/cxoffice (CrossOver Linux)</li>
              </i>
            </ul>
            <span>{t('help.wine.part2')}</span>
          </InfoBox>
        }
      >
        {altWine.map(({ name }) => (
          <option key={name}>{name}</option>
        ))}
      </SelectField>

      {wineVersion.type === 'crossover' && (
        <TextInputField
          label={t('setting.winecrossoverbottle', 'CrossOver Bottle')}
          htmlId="crossoverBottle"
          value={wineCrossoverBottle}
          onChange={(event) => setWineCrossoverBottle(event.target.value)}
        />
      )}

      {isLinux && !isProton && (
        <ToggleSwitch
          htmlId="autodxvk"
          value={autoInstallDxvk}
          handleChange={() => {
            const action = autoInstallDxvk ? 'restore' : 'backup'
            ipcRenderer.send('toggleDXVK', [
              { winePrefix, winePath: wineVersion.bin },
              action
            ])
            return toggleAutoInstallDxvk()
          }}
          title={t('setting.autodxvk', 'Auto Install/Update DXVK on Prefix (Improves performance for DirectX 9/10/11 games)')}
        />
      )}

      {isLinux && !isProton && (
        <ToggleSwitch
          htmlId="autovkd3d"
          value={autoInstallVkd3d}
          handleChange={() => {
            const action = autoInstallVkd3d ? 'restore' : 'backup'
            ipcRenderer.send('toggleVKD3D', [
              { winePrefix, winePath: wineVersion.bin },
              action
            ])
            return toggleAutoInstallVkd3d()
          }}
          title={t('setting.autovkd3d', 'Auto Install/Update VKD3D on Prefix (Improves performance for DirectX 12 games)')}
        />
      )}

      <ToggleSwitch
        htmlId="enableFSR"
        value={enableFSR || false}
        handleChange={toggleFSR}
        title={t(
          'setting.enableFSRHack',
          'Enable FSR Hack (Wine version needs to support it)'
        )}
      />

      {enableFSR && (
        <SelectField
          htmlId="setFsrSharpness"
          onChange={(event) => setFsrSharpness(Number(event.target.value))}
          value={maxSharpness.toString()}
          label={t('setting.FsrSharpnessStrenght', 'FSR Sharpness Strength')}
          extraClass="smaller"
        >
          {Array.from(Array(5).keys()).map((n) => (
            <option key={n + 1}>{n + 1}</option>
          ))}
        </SelectField>
      )}

      {isLinux && (
        <>
          <ToggleSwitch
            htmlId="resizableBar"
            value={enableResizableBar || false}
            handleChange={toggleResizableBar}
            title={t(
              'setting.resizableBar',
              'Enable Resizable BAR (NVIDIA RTX only)'
            )}
          />

          <ToggleSwitch
            htmlId="esyncToggle"
            value={enableEsync || false}
            handleChange={toggleEsync}
            title={t('setting.esync', 'Enable Esync')}
          />

          <ToggleSwitch
            htmlId="fsyncToggle"
            value={enableFsync || false}
            handleChange={toggleFsync}
            title={t('setting.fsync', 'Enable Fsync')}
          />
        </>
      )}
    </>
  )
}
