import './index.css'
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
  const { handleGameStatus, platform } = useContext(ContextProvider)
  const [isWindowsOnLinux, setIsWindowsOnLinux] = useState(false)
  const [winePrefix, setWinePrefix] = useState('')
  const [checkboxChecked, setCheckboxChecked] = useState(false)
  const { t } = useTranslation('gamepage')
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const navigate = useNavigate()

  const checkIfWindowsOnLinux = async () => {
    // This assumes native games are installed should be changed in the future
    // if we add option to install windows games even if native is available
    if (platform === 'linux') {
      const {
        install: { platform: installedplatform }
      } = await window.api.getGameInfo(props.appName, props.runner)

      if (installedplatform?.toLowerCase() === 'windows') {
        const wineprefixForGame = (
          await window.api.getGameSettings(props.appName, props.runner)
        ).winePrefix
        setWinePrefix(wineprefixForGame)
        setIsWindowsOnLinux(true)
      }
    }
    setShowUninstallModal(true)
  }

  useEffect(() => {
    checkIfWindowsOnLinux()
  })

  const storage: Storage = window.localStorage
  const uninstallGame = async () => {
    props.onClose()

    await handleGameStatus({
      appName: props.appName,
      runner: props.runner,
      status: 'uninstalling'
    })
    await window.api.uninstall([props.appName, checkboxChecked, props.runner])
    if (props.runner === 'sideload') {
      navigate('/')
    }
    storage.removeItem(props.appName)
    handleGameStatus({
      appName: props.appName,
      runner: props.runner,
      status: 'done'
    })
  }

  return (
    <>
      {showUninstallModal && (
        <Dialog onClose={props.onClose} showCloseButton>
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
                value={checkboxChecked}
                title={t('gamepage:box.uninstall.checkbox', {
                  defaultValue:
                    "Remove prefix: {{prefix}}{{newLine}}Note: This can't be undone and will also remove not backed up save files.",
                  prefix: winePrefix,
                  newLine: '\n'
                })}
                handleChange={() => {
                  setCheckboxChecked(!checkboxChecked)
                }}
              />
            )}
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
