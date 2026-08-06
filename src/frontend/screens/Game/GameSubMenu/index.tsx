import './index.css'

import { useCallback, useContext, useEffect, useState } from 'react'

import { GameInfo } from 'common/types'

import { createNewWindow, repair } from 'frontend/helpers'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'

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
import { useAwaited } from 'frontend/hooks/useAwaited'
import type { GameHandle } from 'frontend/helpers/ipc'
import { useNavigate } from 'react-router-dom'

interface Props {
  game: GameHandle
  isInstalled: boolean
  title: string
  handleUpdate: () => void
  handleChangeLog: () => void
  disableUpdate: boolean
  onShowRequirements?: () => void
  onShowModifyInstall?: () => void
  gameInfo: GameInfo
}

export default function GamesSubmenu({
  game,
  isInstalled,
  title,
  handleUpdate,
  handleChangeLog,
  disableUpdate,
  onShowRequirements,
  onShowModifyInstall,
  gameInfo
}: Props) {
  const navigate = useNavigate()
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
  const showChangelogButton =
    useAwaited(window.api.game.supportsChangelogs, game) ?? false
  const [protonDBurl, setProtonDBurl] = useState(
    `https://www.protondb.com/search?q=${title}`
  )
  const { t } = useTranslation('gamepage')
  const isSideloaded = game.runner === 'sideload'
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
      await window.api.moveInstall(game, path)
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
      await window.api.changeInstallPath(game, path)
      await refresh(game.runner)
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

  function handleRepair() {
    showDialogModal({
      showDialog: true,
      message: t('box.repair.message'),
      title: t('box.repair.title'),
      buttons: [
        { text: t('box.yes'), onClick: async () => repair(game) },
        { text: t('box.no') }
      ]
    })
  }

  function handleShortcuts() {
    if (hasShortcuts) {
      window.api.removeShortcut(game)
      return setHasShortcuts(false)
    }
    window.api.addShortcut(game, true)

    return setHasShortcuts(true)
  }

  function handleEdit() {
    if (isSideloaded) {
      openInstallGameModal({ game, gameInfo, action: 'install' })
      return
    }

    showDialogModal({
      showDialog: true,
      title: t('edit-game.title', 'Edit Game'),
      message: (
        <EditGameDialog
          game={game}
          gameInfo={gameInfo}
          backdropClick={() => showDialogModal({ showDialog: false })}
        />
      )
    })
  }

  async function handleEosOverlay() {
    setEosOverlayRefresh(true)
    if (eosOverlayEnabled) {
      await window.api.disableEosOverlay(game)
      setEosOverlayEnabled(false)
    } else {
      const initialEnableResult = await window.api.enableEosOverlay(game)
      const { installNow } = initialEnableResult
      let { wasEnabled } = initialEnableResult

      if (installNow) {
        await window.api.installEosOverlay()
        wasEnabled = (await window.api.enableEosOverlay(game)).wasEnabled
      }
      setEosOverlayEnabled(wasEnabled)
    }
    setEosOverlayRefresh(false)
  }

  async function handleAddToSteam() {
    setSteamRefresh(true)
    if (addedToSteam) {
      await window.api.removeFromSteam(game).then(() => setAddedToSteam(false))
    } else {
      await window.api.addToSteam(game).then((added) => setAddedToSteam(added))
    }
    setSteamRefresh(false)
  }

  useEffect(() => {
    // Check for game shortcuts on Steam
    window.api.isAddedToSteam(game).then((added) => {
      setAddedToSteam(added)
    })

    if (!isInstalled) {
      return
    }

    // Check for game shortcuts on desktop and start menu
    window.api.shortcutsExists(game).then((added) => {
      setHasShortcuts(added)
    })

    // only unix specific
    if (!isWin && game.runner === 'legendary') {
      // check if eos overlay is enabled
      const status = libraryStatus.find(
        (game) => game.appName === eosOverlayAppName
      )?.status
      setEosOverlayRefresh(status === 'installing')

      window.api
        .isEosOverlayEnabled(game)
        .then((enabled) => setEosOverlayEnabled(enabled))
    }
  }, [isInstalled])

  useEffect(() => {
    // Get steam id and set direct proton db link
    window.api.getWikiGameInfo(game).then((info) => {
      const steamID = info?.pcgamingwiki?.steamID ?? info?.gamesdb?.steamID
      if (steamID) {
        setProtonDBurl(`https://www.protondb.com/app/${steamID}`)
      }
    })
  }, [game])

  const refreshCircle = () => {
    return <CircularProgress className="link button is-text is-link" />
  }

  const showModifyItem =
    onShowModifyInstall &&
    ['legendary', 'gog'].includes(game.runner) &&
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

  const supportsStoreUrl = useAwaited(window.api.game.supportsStoreUrl, game)

  const navigateToStorePage = useCallback(async () => {
    return window.api.game.getStoreUrl(game).then((storeUrl) => {
      if (storeUrl) navigate(`/store-page?store-url=${storeUrl}`)
    })
  }, [game, navigate])

  return (
    <>
      <div className="gameTools subMenuContainer">
        {showUninstallModal && (
          <UninstallModal
            game={game}
            onClose={() => setShowUninstallModal(false)}
            isDlc={false}
          />
        )}
        <div className={`submenu`}>
          {isInstalled && (
            <>
              <button
                onClick={async () => handleEdit()}
                className="link button is-text is-link buttonWithIcon"
              >
                <EditIcon />
                {isSideloaded
                  ? t('button.sideload.edit', 'Edit App/Game')
                  : t('button.edit-game', 'Edit Game')}
              </button>{' '}
              <button
                onClick={() => handleShortcuts()}
                className="link button is-text is-link buttonWithIcon"
              >
                <ShortcutIcon />
                {hasShortcuts
                  ? t('submenu.removeShortcut', 'Remove shortcuts')
                  : t('submenu.addShortcut', 'Add shortcut')}
              </button>
              <button
                onClick={async () => setShowUninstallModal(true)}
                className="link button is-text is-link buttonWithIcon"
                disabled={is.playing}
              >
                <DeleteIcon />
                {t('button.uninstall', 'Uninstall')}
              </button>{' '}
              {!isSideloaded && !isThirdPartyManaged && (
                <button
                  onClick={async () => handleUpdate()}
                  className="link button is-text is-link buttonWithIcon"
                  disabled={disableUpdate}
                >
                  <ArrowUpwardIcon />
                  {t('button.force_update', 'Force Update if Available')}
                </button>
              )}{' '}
              {!isSideloaded && !isThirdPartyManaged && (
                <button
                  onClick={async () => handleMoveInstall()}
                  className="link button is-text is-link buttonWithIcon"
                >
                  <DriveFileMoveIcon />
                  {t('submenu.move', 'Move Game')}
                </button>
              )}{' '}
              {!isSideloaded && !isThirdPartyManaged && (
                <button
                  onClick={async () => handleChangeInstall()}
                  className="link button is-text is-link buttonWithIcon"
                >
                  <FindInPageIcon />
                  {t('submenu.change', 'Change Install Location')}
                </button>
              )}{' '}
              {!isSideloaded && !isThirdPartyManaged && (
                <button
                  onClick={() => handleRepair()}
                  className="link button is-text is-link buttonWithIcon"
                >
                  <CheckCircleIcon />
                  {t('submenu.verify', 'Verify and Repair')}
                </button>
              )}{' '}
              {isLinux &&
                game.runner === 'legendary' &&
                (eosOverlayRefresh ? (
                  refreshCircle()
                ) : (
                  <button
                    className="link button is-text is-link buttonWithIcon"
                    onClick={handleEosOverlay}
                  >
                    <PictureInPictureIcon />
                    {eosOverlayEnabled
                      ? t('submenu.disableEosOverlay', 'Disable EOS Overlay')
                      : t('submenu.enableEosOverlay', 'Enable EOS Overlay')}
                  </button>
                ))}
            </>
          )}
          {steamRefresh ? (
            refreshCircle()
          ) : (
            <button
              onClick={async () => handleAddToSteam()}
              className="link button is-text is-link buttonWithIcon"
            >
              <SvgIcon>
                <FontAwesomeIcon icon={faSteam} />
              </SvgIcon>
              {addedToSteam
                ? t('submenu.removeFromSteam', 'Remove from Steam')
                : t('submenu.addToSteam', 'Add to Steam')}
            </button>
          )}
          <button
            onClick={() => openGameCategoriesModal(game)}
            className="link button is-text is-link buttonWithIcon"
          >
            <FormatListBulletedIcon />
            {t('submenu.categories', 'Categories')}
          </button>
          {supportsStoreUrl && (
            <button
              className="link button is-text is-link buttonWithIcon"
              onClick={() => navigateToStorePage()}
            >
              <ShoppingCartIcon />
              {t('submenu.store')}
            </button>
          )}
          {showChangelogButton && (
            <button
              onClick={() => handleChangeLog()}
              className="link button is-text is-link buttonWithIcon"
            >
              <InfoIcon />
              {t('button.changelog', 'Show Changelog')}
            </button>
          )}{' '}
          {!isSideloaded && isLinux && (
            <button
              onClick={() => createNewWindow(protonDBurl)}
              className="link button is-text is-link buttonWithIcon"
            >
              <SvgIcon>
                <FontAwesomeIcon icon={faLinux} />
              </SvgIcon>
              {t('submenu.protondb', 'Check Compatibility')}
            </button>
          )}
          {onShowRequirements && (
            <button
              onClick={async () => onShowRequirements()}
              className="link button is-text is-link buttonWithIcon"
            >
              <DesktopAccessDisabledIcon />
              {t('game.requirements', 'Requirements')}
            </button>
          )}
          {showModifyItem && (
            <button
              onClick={async () => onShowModifyInstall()}
              className="link button is-text is-link buttonWithIcon"
            >
              <RepartitionIcon />
              {t('game.modify', 'Modify Installation')}
            </button>
          )}
          {isInstalled && (
            <button
              onClick={async () => onBrowseFiles()}
              className="link button is-text is-link buttonWithIcon"
            >
              <FolderIcon />
              {t('button.browse_files', 'Browse Files')}
            </button>
          )}
          {hasWine && (
            <button
              onClick={async () => onBrowsePrefix()}
              className="link button is-text is-link buttonWithIcon"
            >
              <SvgIcon>
                <FontAwesomeIcon icon={faWineGlass} />
              </SvgIcon>
              {t('button.browse_wine_prefix', 'Browse Wine Prefix')}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
