import './index.css'

import React, { useContext, useEffect, useState } from 'react'

import { WineInstallation } from 'common/types'
import { Path } from 'frontend/types'
import { useTranslation } from 'react-i18next'
import {
  InfoBox,
  ToggleSwitch,
  SvgButton,
  SelectField,
  TextInputField,
  TextInputWithIconField
} from 'frontend/components/UI'

import AddBoxIcon from '@mui/icons-material/AddBox'
import ContextProvider from 'frontend/state/ContextProvider'

import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import { Tooltip } from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolderOpen , faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { configStore } from 'frontend/helpers/electronStores'

import { ipcRenderer } from 'frontend/helpers'

interface Props {
  altWine: WineInstallation[]
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
  preferSystemLibs: boolean
  togglePreferSystemLibs: () => void
}

export default function WineSettings({
  winePrefix,
  setWinePrefix,
  setWineVersion,
  setAltWine,
  wineVersion,
  altWine,
  enableFSR,
  toggleFSR,
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
  setDefaultWinePrefix,
  preferSystemLibs,
  togglePreferSystemLibs
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
      <h3 className="settingSubheader">{isLinux ? 'Wine' : 'Crossover'}</h3>

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

      {isDefault && isLinux && (
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
        label={
          isLinux
            ? t('setting.wineversion')
            : t('setting.crossover-version', 'Crossover Version')
        }
        htmlId="setWineVersion"
        onChange={(event) =>
          setWineVersion(
            altWine.filter(({ name }) => name === event.target.value)[0]
          )
        }
        value={wineVersion.name}
        afterSelect={
          <>
            {isLinux && (
              <InfoBox text={t('infobox.wine-path', 'Wine Path')}>
                {wineVersion.bin}
              </InfoBox>
            )}
            {isLinux && (
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
                  </i>
                </ul>
                <span>{t('help.wine.part2')}</span>
              </InfoBox>
            )}
          </>
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
        <div className="toggleRow">
          <ToggleSwitch
            htmlId="systemLibsToggle"
            value={preferSystemLibs || false}
            handleChange={togglePreferSystemLibs}
            title={t('setting.preferSystemLibs', 'Prefer system libraries')}
          />

          <FontAwesomeIcon
            className="helpIcon"
            icon={faCircleInfo}
            title={t(
              'help.preferSystemLibs',
              'Custom Wine versions (Wine-GE, Wine-Lutris) are shipped with their library dependencies. By enabling this option, these shipped libraries will be ignored and Wine will load system libraries instead. Warning! Issues may occur if dependencies are not met.'
            )}
          />
        </div>
      )}

      {isLinux && (
        <div className="toggleRow">
          <ToggleSwitch
            htmlId="enableFSR"
            value={enableFSR || false}
            handleChange={toggleFSR}
            title={t(
              'setting.enableFSRHack',
              'Enable FSR Hack (Wine version needs to support it)'
            )}
          />

          <FontAwesomeIcon
            className="helpIcon"
            icon={faCircleInfo}
            title={t(
              'help.amdfsr',
              "AMD's FSR helps boost framerate by upscaling lower resolutions in Fullscreen Mode. Image quality increases from 5 to 1 at the cost of a slight performance hit. Enabling may improve performance."
            )}
          />
        </div>
      )}

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
          <div className="toggleRow">
            <ToggleSwitch
              htmlId="resizableBar"
              value={enableResizableBar || false}
              handleChange={toggleResizableBar}
              title={t(
                'setting.resizableBar',
                'Enable Resizable BAR (NVIDIA RTX only)'
              )}
            />

            <FontAwesomeIcon
              className="helpIcon"
              icon={faCircleInfo}
              title={t(
                'help.resizablebar',
                "NVIDIA's Resizable Bar helps boost framerate by making the CPU access the entire graphics buffer. Enabling may improve performance for Vulkan-based games."
              )}
            />
          </div>

          <div className="toggleRow">
            <ToggleSwitch
              htmlId="esyncToggle"
              value={enableEsync || false}
              handleChange={toggleEsync}
              title={t('setting.esync', 'Enable Esync')}
            />

            <FontAwesomeIcon
              className="helpIcon"
              icon={faCircleInfo}
              title={t(
                'help.esync',
                'Esync aims to reduce wineserver overhead in CPU-intensive games. Enabling may improve performance.'
              )}
            />
          </div>

          <div className="toggleRow">
            <ToggleSwitch
              htmlId="fsyncToggle"
              value={enableFsync || false}
              handleChange={toggleFsync}
              title={t('setting.fsync', 'Enable Fsync')}
            />

            <FontAwesomeIcon
              className="helpIcon"
              icon={faCircleInfo}
              title={t(
                'help.fsync',
                'Fsync aims to reduce wineserver overhead in CPU-intensive games. Enabling may improve performance on supported Linux kernels.'
              )}
            />
          </div>
        </>
      )}
    </>
  )
}
