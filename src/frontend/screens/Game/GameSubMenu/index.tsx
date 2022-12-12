import './index.css'

import React, { useContext, useEffect, useState } from 'react'

import { GameStatus, Runner } from 'common/types'

import { createNewWindow, repair } from 'frontend/helpers'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { NavLink } from 'react-router-dom'

import { InstallModal } from 'frontend/screens/Library/components'
import { CircularProgress } from '@mui/material'
import UninstallModal from 'frontend/components/UI/UninstallModal'

interface Props {
  appName: string
  isInstalled: boolean
  title: string
  storeUrl: string
  runner: Runner
  handleUpdate: () => void
  disableUpdate: boolean
  onShowRequirements?: () => void
}

export default function GamesSubmenu({
  appName,
  isInstalled,
  title,
  storeUrl,
  runner,
  handleUpdate,
  disableUpdate,
  onShowRequirements
}: Props) {
  const {
    handleGameStatus,
    refresh,
    platform,
    libraryStatus,
    showDialogModal
  } = useContext(ContextProvider)
  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'

  const [steamRefresh, setSteamRefresh] = useState<boolean>(false)
  const [addedToSteam, setAddedToSteam] = useState<boolean>(false)
  const [hasShortcuts, setHasShortcuts] = useState(false)
  const [eosOverlayEnabled, setEosOverlayEnabled] = useState<boolean>(false)
  const [eosOverlayRefresh, setEosOverlayRefresh] = useState<boolean>(false)
  const [showModal, setShowModal] = useState(false)
  const eosOverlayAppName = '98bc04bc842e4906993fd6d6644ffb8d'
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const { t } = useTranslation('gamepage')
  const isSideloaded = runner === 'sideload'

  const protonDBurl = `https://www.protondb.com/search?q=${title}`

  async function onMoveInstallYesClick() {
    const { defaultInstallPath } = await window.api.requestAppSettings()
    const path = await window.api.openDialog({
      buttonLabel: t('box.choose'),
      properties: ['openDirectory'],
      title: t('box.move.path'),
      defaultPath: defaultInstallPath
    })
    if (path) {
      await handleGameStatus({ appName, runner, status: 'moving' })
      await window.api.moveInstall({ appName, path, runner })
      await handleGameStatus({ appName, runner, status: 'done' })
    }
  }

  function handleMoveInstall() {
    showDialogModal({
      showDialog: true,
      message: t('box.move.message'),
      title: t('box.move.title'),
      buttons: [
        { text: t('box.yes'), onClick: onMoveInstallYesClick },
        { text: t('box.no') }
      ]
    })
  }

  async function onChangeInstallYesClick() {
    const { defaultInstallPath } = await window.api.requestAppSettings()
    const path = await window.api.openDialog({
      buttonLabel: t('box.choose'),
      properties: ['openDirectory'],
      title: t('box.change.path'),
      defaultPath: defaultInstallPath
    })
    if (path) {
      await window.api.changeInstallPath({ appName, path, runner })
      await refresh(runner)
    }
  }

  function handleChangeInstall() {
    showDialogModal({
      showDialog: true,
      message: t('box.change.message'),
      title: t('box.change.title'),
      buttons: [
        { text: t('box.yes'), onClick: onChangeInstallYesClick },
        { text: t('box.no') }
      ]
    })
  }

  async function onRepairYesClick(appName: string) {
    await handleGameStatus({ appName, runner, status: 'repairing' })
    await repair(appName, runner)
    await handleGameStatus({ appName, runner, status: 'done' })
  }

  function handleRepair(appName: string) {
    showDialogModal({
      showDialog: true,
      message: t('box.repair.message'),
      title: t('box.repair.title'),
      buttons: [
        { text: t('box.yes'), onClick: async () => onRepairYesClick(appName) },
        { text: t('box.no') }
      ]
    })
  }

  function handleShortcuts() {
    if (hasShortcuts) {
      window.api.removeShortcut(appName, runner)
      return setHasShortcuts(false)
    }
    window.api.addShortcut(appName, runner, true)

    return setHasShortcuts(true)
  }

  function handleEdit() {
    setShowModal(true)
  }

  async function handleEosOverlay() {
    setEosOverlayRefresh(true)
    if (eosOverlayEnabled) {
      await window.api.disableEosOverlay(appName)
      setEosOverlayEnabled(false)
    } else {
      const initialEnableResult = await window.api.enableEosOverlay(appName)
      const { installNow } = initialEnableResult
      let { wasEnabled } = initialEnableResult

      if (installNow) {
        await handleGameStatus({
          appName: eosOverlayAppName,
          runner: 'legendary',
          status: 'installing'
        })

        await window.api.installEosOverlay()
        await handleGameStatus({
          appName: eosOverlayAppName,
          runner: 'legendary',
          status: 'done'
        })

        wasEnabled = (await window.api.enableEosOverlay(appName)).wasEnabled
      }
      setEosOverlayEnabled(wasEnabled)
    }
    setEosOverlayRefresh(false)
  }

  async function handleAddToSteam() {
    setSteamRefresh(true)
    if (addedToSteam) {
      await window.api
        .removeFromSteam(appName, runner)
        .then(() => setAddedToSteam(false))
    } else {
      await window.api
        .addToSteam(appName, runner)
        .then((added) => setAddedToSteam(added))
    }
    setSteamRefresh(false)
  }

  useEffect(() => {
    if (!isInstalled) {
      return
    }

    // Check for game shortcuts on desktop and start menu
    window.api.shortcutsExists(appName, runner).then((added) => {
      setHasShortcuts(added)
    })

    // Check for game shortcuts on Steam
    window.api.isAddedToSteam(appName, runner).then((added) => {
      setAddedToSteam(added)
    })

    // only unix specific
    if (!isWin && runner === 'legendary') {
      // check if eos overlay is enabled
      const { status } =
        libraryStatus.filter(
          (game: GameStatus) => game.appName === eosOverlayAppName
        )[0] || {}
      setEosOverlayRefresh(status === 'installing')

      window.api
        .isEosOverlayEnabled(appName)
        .then((enabled) => setEosOverlayEnabled(enabled))
    }
  }, [isInstalled])

  const refreshCircle = () => {
    return <CircularProgress className="link button is-text is-link" />
  }

  return (
    <>
      <div className="gameTools subMenuContainer">
        {showUninstallModal && (
          <UninstallModal
            appName={appName}
            runner={runner}
            onClose={() => setShowUninstallModal(false)}
          />
        )}
        <div className={`submenu`}>
          {isInstalled && (
            <>
              {isSideloaded && (
                <button
                  onClick={async () => handleEdit()}
                  className="link button is-text is-link"
                >
                  {t('button.sideload.edit', 'Edit App/Game')}
                </button>
              )}{' '}
              <button
                onClick={() => handleShortcuts()}
                className="link button is-text is-link"
              >
                {hasShortcuts
                  ? t('submenu.removeShortcut', 'Remove shortcuts')
                  : t('submenu.addShortcut', 'Add shortcut')}
              </button>
              {steamRefresh ? (
                refreshCircle()
              ) : (
                <button
                  onClick={async () => handleAddToSteam()}
                  className="link button is-text is-link"
                >
                  {addedToSteam
                    ? t('submenu.removeFromSteam', 'Remove from Steam')
                    : t('submenu.addToSteam', 'Add to Steam')}
                </button>
              )}
              <button
                onClick={async () => setShowUninstallModal(true)}
                className="link button is-text is-link"
              >
                {t('button.uninstall')}
              </button>{' '}
              {!isSideloaded && (
                <button
                  onClick={async () => handleUpdate()}
                  className="link button is-text is-link"
                  disabled={disableUpdate}
                >
                  {t('button.force_update', 'Force Update if Available')}
                </button>
              )}{' '}
              {!isSideloaded && (
                <button
                  onClick={async () => handleMoveInstall()}
                  className="link button is-text is-link"
                >
                  {t('submenu.move')}
                </button>
              )}{' '}
              {!isSideloaded && (
                <button
                  onClick={async () => handleChangeInstall()}
                  className="link button is-text is-link"
                >
                  {t('submenu.change')}
                </button>
              )}{' '}
              {!isSideloaded && (
                <button
                  onClick={async () => handleRepair(appName)}
                  className="link button is-text is-link"
                >
                  {t('submenu.verify')}
                </button>
              )}{' '}
              {isLinux &&
                runner === 'legendary' &&
                (eosOverlayRefresh ? (
                  refreshCircle()
                ) : (
                  <button
                    className="link button is-text is-link"
                    onClick={handleEosOverlay}
                  >
                    {eosOverlayEnabled
                      ? t('submenu.disableEosOverlay', 'Disable EOS Overlay')
                      : t('submenu.enableEosOverlay', 'Enable EOS Overlay')}
                  </button>
                ))}
            </>
          )}
          {!isSideloaded && (
            <NavLink
              className="link button is-text is-link"
              to={`/store-page?store-url=${storeUrl}`}
            >
              {t('submenu.store')}
            </NavLink>
          )}
          {!isSideloaded && !isWin && (
            <button
              onClick={() => createNewWindow(protonDBurl)}
              className="link button is-text is-link"
            >
              {t('submenu.protondb')}
            </button>
          )}
          {onShowRequirements && (
            <button
              onClick={async () => onShowRequirements()}
              className="link button is-text is-link"
            >
              {t('game.requirements', 'Requirements')}
            </button>
          )}
        </div>
      </div>
      {showModal && (
        <InstallModal
          appName={appName}
          runner={runner}
          backdropClick={() => setShowModal(false)}
        />
      )}
    </>
  )
}
