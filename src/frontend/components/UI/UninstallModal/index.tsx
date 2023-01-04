import './index.scss'
import React, { useContext, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'
import { Runner } from 'common/types'
import ToggleSwitch from '../ToggleSwitch'
import { useNavigate } from 'react-router-dom'

interface UninstallModalProps {
  appName: string
  runner: Runner
  onClose: () => void
}

const UninstallModal: React.FC<UninstallModalProps> = function (props) {
  const { platform, refreshLibrary } = useContext(ContextProvider)
  const [isWindowsOnLinux, setIsWindowsOnLinux] = useState(false)
  const [winePrefix, setWinePrefix] = useState('')
  const [deletePrefixChecked, setDeletePrefixChecked] = useState(false)
  const [deleteSettingsChecked, setDeleteSettingsChecked] = useState(false)
  const [disableDeleteWine, setDisableDeleteWine] = useState(false)
  const { t } = useTranslation('gamepage')
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const navigate = useNavigate()

  const checkIfWindowsOnLinux = async () => {
    // This assumes native games are installed should be changed in the future
    // if we add option to install windows games even if native is available

    setShowUninstallModal(true)

    if (platform !== 'linux') {
      return
    }

    const gameInfo = await window.api.getGameInfo(props.appName, props.runner)
    if (!gameInfo) {
      return
    }

    const { install } = gameInfo
    if (install.platform?.toLowerCase() !== 'windows') {
      return
    }

    const gameSettings = await window.api.getGameSettings(
      props.appName,
      props.runner
    )
    if (!gameSettings) {
      return
    }

    const defaultSettings = await window.api.requestGameSettings('default')

    setIsWindowsOnLinux(true)
    setWinePrefix(gameSettings.winePrefix)
    setDisableDeleteWine(gameSettings.winePrefix === defaultSettings.winePrefix)
  }

  useEffect(() => {
    checkIfWindowsOnLinux()
  }, [])

  const storage: Storage = window.localStorage
  const uninstallGame = async () => {
    props.onClose()

    await window.api.uninstall(
      props.appName,
      props.runner,
      deletePrefixChecked,
      deleteSettingsChecked
    )
    if (props.runner === 'sideload') {
      navigate('/')
    }
    storage.removeItem(props.appName)
    refreshLibrary({ fullRefresh: true, checkForUpdates: false })
  }

  return (
    <>
      {showUninstallModal && (
        <Dialog
          onClose={props.onClose}
          showCloseButton
          className="uninstall-modal"
        >
          <DialogHeader onClose={props.onClose}>
            {t('gamepage:box.uninstall.title')}
          </DialogHeader>
          <DialogContent>
            <div className="uninstallModalMessage">
              {t('gamepage:box.uninstall.message')}
            </div>
            {isWindowsOnLinux && (
              <ToggleSwitch
                htmlId="uninstallCheckbox"
                value={deletePrefixChecked}
                title={t('gamepage:box.uninstall.checkbox', {
                  defaultValue:
                    "Remove prefix: {{prefix}}{{newLine}}Note: This can't be undone and will also remove not backed up save files.",
                  prefix: winePrefix,
                  newLine: '\n'
                })}
                disabled={disableDeleteWine}
                handleChange={() => {
                  setDeletePrefixChecked(!deletePrefixChecked)
                }}
              />
            )}
            {disableDeleteWine && (
              <p className="default-wine-warning">
                {t(
                  'gamepage:box.uninstall.prefix_warning',
                  'The Wine prefix for this game is the default prefix. If you really want to delete it, you have to do it manually.'
                )}
              </p>
            )}
            <ToggleSwitch
              htmlId="uninstallsettingCheckbox"
              value={deleteSettingsChecked}
              title={t('gamepage:box.uninstall.settingcheckbox', {
                defaultValue:
                  "Erase settings and remove log{{newLine}}Note: This can't be undone. Any modified settings will be forgotten and log will be deleted.",
                newLine: '\n'
              })}
              handleChange={() => {
                setDeleteSettingsChecked(!deleteSettingsChecked)
              }}
            />
          </DialogContent>
          <DialogFooter>
            <button
              onClick={uninstallGame}
              className={`button is-secondary outline`}
            >
              {t('box.yes')}
            </button>
            <button
              onClick={props.onClose}
              className={`button is-secondary outline`}
            >
              {t('box.no')}
            </button>
          </DialogFooter>
        </Dialog>
      )}
    </>
  )
}

export default UninstallModal
