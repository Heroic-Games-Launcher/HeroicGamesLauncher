import { faCircleInfo, faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { WineInstallation } from 'common/types'

interface Props {
  wineVersion: WineInstallation
  winePrefix: string
  eacRuntime: boolean
  toggleEacRuntime: () => void
  gameMode: boolean
  toggleGameMode: () => void
  battlEyeRuntime: boolean
  toggleBattlEyeRuntime: () => void
  autoInstallDxvk: boolean
  toggleAutoInstallDxvk: () => void
  autoInstallVkd3d: boolean
  toggleAutoInstallVkd3d: () => void
}

export default function WineExtensions({
  wineVersion,
  winePrefix,
  eacRuntime,
  gameMode,
  battlEyeRuntime,
  autoInstallDxvk,
  autoInstallVkd3d,
  toggleEacRuntime,
  toggleGameMode,
  toggleBattlEyeRuntime,
  toggleAutoInstallDxvk,
  toggleAutoInstallVkd3d
}: Props) {
  const [eacInstalling, setEacInstalling] = useState(false)
  const [battlEyeInstalling, setBattlEyeInstalling] = useState(false)
  const isProton = wineVersion.type === 'proton'
  const { t } = useTranslation()

  const handleEacRuntime = async () => {
    if (!eacRuntime) {
      if (!gameMode) {
        const isFlatpak = await window.api.isFlatpak()
        if (isFlatpak) {
          const { response } = await window.api.openMessageBox({
            message: t(
              'settings.eacRuntime.gameModeRequired.message',
              'GameMode is required for the EAC runtime to work on Flatpak. Do you want to enable it now?'
            ),
            title: t(
              'settings.eacRuntime.gameModeRequired.title',
              'GameMode required'
            ),
            buttons: [t('box.yes'), t('box.no')]
          })
          if (response === 1) {
            return
          }
          toggleGameMode()
        }
      }
      const isInstalled = await window.api.isRuntimeInstalled('eac_runtime')
      if (!isInstalled) {
        setEacInstalling(true)
        const success = await window.api.downloadRuntime('eac_runtime')
        setEacInstalling(false)
        if (!success) {
          return
        }
      }
    }
    toggleEacRuntime()
  }

  const handleBattlEyeRuntime = async () => {
    if (!battlEyeRuntime) {
      const isInstalled = await window.api.isRuntimeInstalled(
        'battleye_runtime'
      )
      if (!isInstalled) {
        setBattlEyeInstalling(true)
        const success = await window.api.downloadRuntime('battleye_runtime')
        setBattlEyeInstalling(false)
        if (!success) {
          return
        }
      }
    }
    toggleBattlEyeRuntime()
  }

  return (
    <>
      <h3 className="settingsSubheader">
        {t('settings.navbar.wineExt', 'Wine Extensions')}
      </h3>

      {!isProton && (
        <>
          <div className="toggleRow">
            <ToggleSwitch
              htmlId="autodxvk"
              value={autoInstallDxvk}
              handleChange={() => {
                const action = autoInstallDxvk ? 'restore' : 'backup'
                window.api.toggleDXVK([
                  { winePrefix, winePath: wineVersion.bin },
                  action
                ])
                return toggleAutoInstallDxvk()
              }}
              title={t(
                'setting.autodxvk',
                'Auto Install/Update DXVK on Prefix'
              )}
            />

            <FontAwesomeIcon
              className="helpIcon"
              icon={faCircleInfo}
              title={t(
                'help.dxvk',
                'DXVK is a Vulkan-based translational layer for DirectX 9, 10 and 11 games. Enabling may improve compatibility. Might cause issues especially for older DirectX games.'
              )}
            />
          </div>
          <div className="toggleRow">
            <ToggleSwitch
              htmlId="autovkd3d"
              value={autoInstallVkd3d}
              handleChange={() => {
                const action = autoInstallVkd3d ? 'restore' : 'backup'
                window.api.toggleVKD3D([
                  { winePrefix, winePath: wineVersion.bin },
                  action
                ])
                return toggleAutoInstallVkd3d()
              }}
              title={t(
                'setting.autovkd3d',
                'Auto Install/Update VKD3D on Prefix'
              )}
            />

            <FontAwesomeIcon
              className="helpIcon"
              icon={faCircleInfo}
              title={t(
                'help.vkd3d',
                'VKD3D is a Vulkan-based translational layer for DirectX 12 games. Enabling may improve compatibility significantly. Has no effect on older DirectX games.'
              )}
            />
          </div>
        </>
      )}

      <ToggleSwitch
        htmlId="eacRuntime"
        value={eacRuntime}
        handleChange={handleEacRuntime}
        title={t('settings.eacRuntime.name', 'EasyAntiCheat Runtime')}
      />
      {eacInstalling && (
        <span>
          <FontAwesomeIcon className="fa-spin" icon={faSyncAlt} />
          {t('settings.eacRuntime.installing', 'Installing EAC Runtime...')}
        </span>
      )}
      <ToggleSwitch
        htmlId="battlEyeRuntime"
        value={battlEyeRuntime}
        handleChange={handleBattlEyeRuntime}
        title={t('settings.battlEyeRuntime.name', 'BattlEye AntiCheat Runtime')}
      />
      {battlEyeInstalling && (
        <span>
          <FontAwesomeIcon className="fa-spin" icon={faSyncAlt} />
          {t(
            'settings.battlEyeRuntime.installing',
            'Installing BattlEye Runtime...'
          )}
        </span>
      )}
    </>
  )
}
