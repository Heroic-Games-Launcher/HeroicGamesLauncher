import './index.scss'
import React, { useContext, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import { useTranslation } from 'react-i18next'
import { Runner } from 'common/types'
import ToggleSwitch from '../ToggleSwitch'
import { useNavigate, useLocation } from 'react-router-dom'
import ContextProvider from 'frontend/state/ContextProvider'

interface UninstallModalProps {
  appName: string
  runner: Runner
  onClose: () => void
  isDlc: boolean
}

const UninstallModal: React.FC<UninstallModalProps> = function ({
  appName,
  runner,
  onClose,
  isDlc
}) {
  const [isNative, setIsNative] = useState(true)
  const [winePrefix, setWinePrefix] = useState('')
  const [deletePrefixChecked, setDeletePrefixChecked] = useState(false)
  const [deleteSettingsChecked, setDeleteSettingsChecked] = useState(false)
  const [disableDeleteWine, setDisableDeleteWine] = useState(false)
  const { t } = useTranslation('gamepage')
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { installingEpicGame } = useContext(ContextProvider)
  const [gameTitle, setGameTitle] = useState('')

  const checkIfIsNative = async () => {
    // This assumes native games are installed should be changed in the future
    // if we add option to install windows games even if native is available

    setShowUninstallModal(true)

    const gameInfo = await window.api.getGameInfo(appName, runner)

    const isNative = await window.api.isNative({
      runner,
      appName
    })
    setIsNative(isNative)

    if (isDlc) {
      return
    }

    if (!gameInfo) {
      return
    }

    setGameTitle(gameInfo.title)

    const { install } = gameInfo
    if (install.platform?.toLowerCase() !== 'windows') {
      return
    }

    const gameSettings = await window.api.config.game.get(appName, runner)
    const { winePrefix: defaultPrefix } = await window.api.config.global.get()

    setWinePrefix(gameSettings.winePrefix)
    setDisableDeleteWine(gameSettings.winePrefix === defaultPrefix)
  }

  useEffect(() => {
    checkIfIsNative()
  }, [])

  const storage: Storage = window.localStorage
  const uninstallGame = async () => {
    onClose()

    await window.api.uninstall(
      appName,
      runner,
      deletePrefixChecked,
      deleteSettingsChecked
    )
    if (runner === 'sideload' && location.pathname.match(/gamepage/)) {
      navigate('/#library')
    }
    storage.removeItem(appName)
  }

  const showWineCheckbox = !isNative && !isDlc

  // disallow uninstalling epic games if an epic game is being installed
  if (installingEpicGame && runner === 'legendary') {
    return (
      <>
        {showUninstallModal && (
          <Dialog onClose={onClose} showCloseButton className="uninstall-modal">
            <DialogHeader onClose={onClose}>
              {t('gamepage:box.uninstall.title')}
            </DialogHeader>
            <DialogContent>
              {t(
                'gamepage:box.uninstall.cannotUninstallEpic',
                'Epic games cannot be uninstalled while another Epic game is being installed.'
              )}
            </DialogContent>
            <DialogFooter>
              <button onClick={onClose} className={`button outline`}>
                {t('box.close', 'Close')}
              </button>
            </DialogFooter>
          </Dialog>
        )}
      </>
    )
  }

  // normal dialog to uninstall a game
  return (
    <>
      {showUninstallModal && (
        <Dialog onClose={onClose} showCloseButton className="uninstall-modal">
          <DialogHeader onClose={onClose}>
            {t('gamepage:box.uninstall.title')}
          </DialogHeader>
          <DialogContent>
            <div className="uninstallModalMessage">
              {isDlc
                ? t('gamepage:box.uninstall.dlc', {
                    defaultValue: 'Do you want to uninstall "{{title}}" (DLC)?',
                    title: gameTitle
                  })
                : t('gamepage:box.uninstall.message', {
                    defaultValue: 'Do you want to uninstall "{{title}}"?',
                    title: gameTitle
                  })}
            </div>
            {showWineCheckbox && (
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
            {!isDlc && (
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
            )}
          </DialogContent>
          <DialogFooter>
            <button
              onClick={uninstallGame}
              className={`button is-secondary outline`}
            >
              {t('box.yes')}
            </button>
            <button onClick={onClose} className={`button is-secondary outline`}>
              {t('box.no')}
            </button>
          </DialogFooter>
        </Dialog>
      )}
    </>
  )
}

export default UninstallModal
