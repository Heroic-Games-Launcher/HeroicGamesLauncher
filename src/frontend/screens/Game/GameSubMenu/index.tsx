import './index.css'

import { useCallback, useContext, useEffect, useState } from 'react'

import { GameInfo, GameStatus, Runner } from 'common/types'

import { createNewWindow } from 'frontend/helpers'
import { repair } from 'frontend/helpers/library'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { NavLink } from 'react-router-dom'

import { CircularProgress, SvgIcon } from '@mui/material'
import UninstallModal from 'frontend/components/UI/UninstallModal'
import GameContext from '../GameContext'
import { openInstallGameModal } from 'frontend/state/InstallGameModal'
import useGlobalState from 'frontend/state/GlobalStateV2'
import EditGameDialog from 'frontend/components/UI/EditGameDialog'

import {
  ArrowUpward as ArrowUpwardIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  DesktopAccessDisabled as DesktopAccessDisabledIcon,
  DriveFileMove as DriveFileMoveIcon,
  Edit as EditIcon,
  FindInPage as FindInPageIcon,
  Folder as FolderIcon,
  FormatListBulleted as FormatListBulletedIcon,
  Info as InfoIcon,
  PictureInPicture as PictureInPictureIcon,
  Repartition as RepartitionIcon,
  Shortcut as ShortcutIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLinux, faSteam } from '@fortawesome/free-brands-svg-icons'
import { faWineGlass } from '@fortawesome/free-solid-svg-icons'
import { Button } from 'frontend/components/UI'

interface Props {
  appName: string
  isInstalled: boolean
  title: string
  storeUrl: string
  changelog?: string
  runner: Runner
  handleUpdate: () => void
  handleChangeLog: () => void
  disableUpdate: boolean
  onShowRequirements?: () => void
  onShowModifyInstall?: () => void
  gameInfo: GameInfo
}

export default function GamesSubmenu({
  appName,
  isInstalled,
  title,
  storeUrl,
  changelog,
  runner,
  handleUpdate,
  handleChangeLog,
  disableUpdate,
  onShowRequirements,
  onShowModifyInstall,
  gameInfo
}: Props) {
  const { refresh, platform, libraryStatus, showDialogModal } =
    useContext(ContextProvider)
  const { openGameCategoriesModal } = useGlobalState.keys(
    'openGameCategoriesModal'
  )
  const { is, gameSettings } = useContext(GameContext)
  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'

  const [steamRefresh, setSteamRefresh] = useState<boolean>(false)
  const [addedToSteam, setAddedToSteam] = useState<boolean>(false)
  const [hasShortcuts, setHasShortcuts] = useState(false)
  const [eosOverlayEnabled, setEosOverlayEnabled] = useState<boolean>(false)
  const [eosOverlayRefresh, setEosOverlayRefresh] = useState<boolean>(false)
  const eosOverlayAppName = '98bc04bc842e4906993fd6d6644ffb8d'
  const [showUninstallModal, setShowUninstallModal] = useState(false)
  const [protonDBurl, setProtonDBurl] = useState(
    `https://www.protondb.com/search?q=${title}`
  )
  const { t } = useTranslation('gamepage')
  const isSideloaded = runner === 'sideload'
  const isThirdPartyManaged = !!gameInfo.thirdPartyManagedApp

  async function onMoveInstallYesClick() {
    const { defaultInstallPath } = await window.api.requestAppSettings()
    const path = await window.api.openDialog({
      buttonLabel: t('box.choose'),
      properties: ['openDirectory'],
      title: t('box.move.path'),
      defaultPath: defaultInstallPath
    })
    if (path) {
      await window.api.moveInstall({ appName, path, runner })
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
    await repair(appName, runner)
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
    if (isSideloaded) {
      openInstallGameModal({ appName, runner, gameInfo })
      return
    }

    showDialogModal({
      showDialog: true,
      title: t('edit-game.title', 'Edit Game'),
      message: (
        <EditGameDialog
          gameInfo={gameInfo}
          backdropClick={() => showDialogModal({ showDialog: false })}
        />
      )
    })
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
        await window.api.installEosOverlay()
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
        .then((removed) => setAddedToSteam(!removed))
    } else {
      await window.api
        .addToSteam(appName, runner)
        .then((added) => setAddedToSteam(added))
    }
    setSteamRefresh(false)
  }

  useEffect(() => {
    // Check for game shortcuts on Steam
    window.api.isAddedToSteam(appName, runner).then((added) => {
      setAddedToSteam(added)
    })

    if (!isInstalled) {
      return
    }

    // Check for game shortcuts on desktop and start menu
    window.api.shortcutsExists(appName, runner).then((added) => {
      setHasShortcuts(added)
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

  useEffect(() => {
    // Get steam id and set direct proton db link
    window.api.getWikiGameInfo(title, appName, runner).then((info) => {
      const steamID = info?.pcgamingwiki?.steamID ?? info?.gamesdb?.steamID
      if (steamID) {
        setProtonDBurl(`https://www.protondb.com/app/${steamID}`)
      }
    })
  }, [title, appName])

  const refreshCircle = () => {
    return <CircularProgress className="link Button Button--ghost Button--sm" />
  }

  const showModifyItem =
    onShowModifyInstall &&
    ['legendary', 'gog'].includes(runner) &&
    isInstalled &&
    !isThirdPartyManaged

  const hasWine =
    !is.win && !is.native && gameSettings?.wineVersion.type !== 'crossover'

  const onBrowseFiles = useCallback(() => {
    const path = gameInfo.install.install_path || gameInfo.folder_name

    if (path) {
      window.api.openFolder(path)
    }
  }, [gameInfo])

  const onBrowsePrefix = useCallback(() => {
    const path = gameSettings?.winePrefix

    if (path) {
      window.api.openFolder(path)
    }
  }, [gameSettings])

  return (
    <>
      <div className="gameTools subMenuContainer">
        {showUninstallModal && (
          <UninstallModal
            appName={appName}
            runner={runner}
            onClose={() => setShowUninstallModal(false)}
            isDlc={false}
          />
        )}
        <div className={`submenu`}>
          {isInstalled && (
            <>
              <Button
                variant="ghost"
                className="link buttonWithIcon"
                onClick={async () => handleEdit()}
              >
                <EditIcon />
                {isSideloaded
                  ? t('button.sideload.edit', 'Edit App/Game')
                  : t('button.edit-game', 'Edit Game')}
              </Button>{' '}
              <Button
                variant="ghost"
                className="link buttonWithIcon"
                onClick={() => handleShortcuts()}
              >
                <ShortcutIcon />
                {hasShortcuts
                  ? t('submenu.removeShortcut', 'Remove shortcuts')
                  : t('submenu.addShortcut', 'Add shortcut')}
              </Button>
              <Button
                variant="ghost"
                className="link buttonWithIcon"
                onClick={async () => setShowUninstallModal(true)}
                disabled={is.playing}
              >
                <DeleteIcon />
                {t('button.uninstall', 'Uninstall')}
              </Button>{' '}
              {!isSideloaded && !isThirdPartyManaged && (
                <Button
                  variant="ghost"
                  className="link buttonWithIcon"
                  onClick={async () => handleUpdate()}
                  disabled={disableUpdate}
                >
                  <ArrowUpwardIcon />
                  {t('button.force_update', 'Force Update if Available')}
                </Button>
              )}{' '}
              {!isSideloaded && !isThirdPartyManaged && (
                <Button
                  variant="ghost"
                  className="link buttonWithIcon"
                  onClick={async () => handleMoveInstall()}
                >
                  <DriveFileMoveIcon />
                  {t('submenu.move', 'Move Game')}
                </Button>
              )}{' '}
              {!isSideloaded && !isThirdPartyManaged && (
                <Button
                  variant="ghost"
                  className="link buttonWithIcon"
                  onClick={async () => handleChangeInstall()}
                >
                  <FindInPageIcon />
                  {t('submenu.change', 'Change Install Location')}
                </Button>
              )}{' '}
              {!isSideloaded && !isThirdPartyManaged && (
                <Button
                  variant="ghost"
                  className="link buttonWithIcon"
                  onClick={async () => handleRepair(appName)}
                >
                  <CheckCircleIcon />
                  {t('submenu.verify', 'Verify and Repair')}
                </Button>
              )}{' '}
              {isLinux &&
                runner === 'legendary' &&
                (eosOverlayRefresh ? (
                  refreshCircle()
                ) : (
                  <Button
                    variant="ghost"
                    className="link buttonWithIcon"
                    onClick={handleEosOverlay}
                  >
                    <PictureInPictureIcon />
                    {eosOverlayEnabled
                      ? t('submenu.disableEosOverlay', 'Disable EOS Overlay')
                      : t('submenu.enableEosOverlay', 'Enable EOS Overlay')}
                  </Button>
                ))}
            </>
          )}
          {steamRefresh ? (
            refreshCircle()
          ) : (
            <Button
              variant="ghost"
              className="link buttonWithIcon"
              onClick={async () => handleAddToSteam()}
            >
              <SvgIcon>
                <FontAwesomeIcon icon={faSteam} />
              </SvgIcon>
              {addedToSteam
                ? t('submenu.removeFromSteam', 'Remove from Steam')
                : t('submenu.addToSteam', 'Add to Steam')}
            </Button>
          )}
          <Button
            variant="ghost"
            className="link buttonWithIcon"
            onClick={() => openGameCategoriesModal(gameInfo)}
          >
            <FormatListBulletedIcon />
            {t('submenu.categories', 'Categories')}
          </Button>
          {!isSideloaded && storeUrl && (
            <NavLink
              className="link Button Button--ghost Button--sm buttonWithIcon"
              to={`/store-page?store-url=${storeUrl}`}
            >
              <ShoppingCartIcon />
              {t('submenu.store')}
            </NavLink>
          )}
          {!isSideloaded && !!changelog?.length && (
            <Button
              variant="ghost"
              className="link buttonWithIcon"
              onClick={() => handleChangeLog()}
            >
              <InfoIcon />
              {t('button.changelog', 'Show Changelog')}
            </Button>
          )}{' '}
          {!isSideloaded && isLinux && (
            <Button
              variant="ghost"
              className="link buttonWithIcon"
              onClick={() => createNewWindow(protonDBurl)}
            >
              <SvgIcon>
                <FontAwesomeIcon icon={faLinux} />
              </SvgIcon>
              {t('submenu.protondb', 'Check Compatibility')}
            </Button>
          )}
          {onShowRequirements && (
            <Button
              variant="ghost"
              className="link buttonWithIcon"
              onClick={async () => onShowRequirements()}
            >
              <DesktopAccessDisabledIcon />
              {t('game.requirements', 'Requirements')}
            </Button>
          )}
          {showModifyItem && (
            <Button
              variant="ghost"
              className="link buttonWithIcon"
              onClick={async () => onShowModifyInstall()}
            >
              <RepartitionIcon />
              {t('game.modify', 'Modify Installation')}
            </Button>
          )}
          {isInstalled && (
            <Button
              variant="ghost"
              className="link buttonWithIcon"
              onClick={async () => onBrowseFiles()}
            >
              <FolderIcon />
              {t('button.browse_files', 'Browse Files')}
            </Button>
          )}
          {hasWine && (
            <Button
              variant="ghost"
              className="link buttonWithIcon"
              onClick={async () => onBrowsePrefix()}
            >
              <SvgIcon>
                <FontAwesomeIcon icon={faWineGlass} />
              </SvgIcon>
              {t('button.browse_wine_prefix', 'Browse Wine Prefix')}
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
