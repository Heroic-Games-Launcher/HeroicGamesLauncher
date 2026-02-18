import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import GameContext from '../../GameContext'
import { CloudOff, CloudQueue } from '@mui/icons-material'
import { GameInfo, SyncType } from 'common/types'
import { GOGCloudSavesLocation } from 'common/types/gog'
import InfoIcon from 'frontend/components/UI/InfoIcon'
import useSetting from 'frontend/hooks/useSetting'
import { syncSaves } from 'frontend/helpers'
import { Menu, MenuItem, Divider } from '@mui/material'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'

interface Props {
  gameInfo: GameInfo
}

const CloudSavesSync = ({ gameInfo }: Props) => {
  const { t } = useTranslation('gamepage')
  const { t: tCommon } = useTranslation()
  const { gameSettings, is } = useContext(GameContext)
  const { showDialogModal } = useContext(ContextProvider)

  const [autoSyncSaves, setAutoSyncSaves] = useSetting('autoSyncSaves', false)
  const [savesPath] = useSetting('savesPath', '')
  const [gogSaves] = useSetting('gogSaves', [])

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const open = Boolean(anchorEl)

  if (!gameSettings) {
    return null
  }

  if (!gameInfo.is_installed) {
    return null
  }

  if (gameInfo.runner === 'sideload') {
    return null
  }

  if (!gameInfo.cloud_save_enabled) {
    return null
  }

  const cloud_save_enabled = gameInfo.cloud_save_enabled || false
  const showCloudSaveInfo = cloud_save_enabled && !is.linuxNative

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSync = async (syncType: SyncType) => {
    if (
      (syncType as string) === '--force-download' ||
      (syncType as string) === '--force-upload'
    ) {
      showDialogModal({
        title: t('box.warning.title', 'Warning'),
        message:
          (syncType as string) === '--force-upload'
            ? t(
                'box.sync.force_upload_warning',
                'Cloud saves will be overwritten. Do you want to proceed?'
              )
            : t(
                'box.sync.force_download_warning',
                'Local saves will be erased. Do you want to proceed?'
              ),
        buttons: [
          {
            text: t('box.yes'),
            onClick: () => executeSync(syncType)
          },
          {
            text: t('box.no'),
            onClick: () => null // Close handled by dialog
          }
        ]
      })
      handleClose()
      return
    }

    await executeSync(syncType)
  }

  const executeSync = async (syncType: SyncType) => {
    setIsSyncing(true)

    if (gameInfo.runner === 'gog') {
      let locations = gogSaves
      if (!locations.length) {
        locations = (await window.api.getDefaultSavePath(
          gameInfo.app_name,
          'gog',
          []
        )) as GOGCloudSavesLocation[]
      }

      await window.api
        .syncGOGSaves(locations, gameInfo.app_name, syncType)
        .then((stderr) => {
          window.api.logError(stderr)
        })
    } else {
      let path = savesPath
      if (!path) {
        path = (await window.api.getDefaultSavePath(
          gameInfo.app_name,
          'legendary',
          []
        )) as string
      }

      await syncSaves(path, gameInfo.app_name, gameInfo.runner, syncType)
    }

    setIsSyncing(false)
    handleClose()
  }

  const handleOpenFolder = () => {
    if (gameInfo.runner === 'gog') {
      gogSaves.forEach((save) => {
        window.api.showItemInFolder(save.location)
      })
    } else {
      window.api.showItemInFolder(savesPath)
    }
    handleClose()
  }

  const syncCommands = [
    { name: tCommon('setting.manualsync.download'), value: '--skip-upload' },
    { name: tCommon('setting.manualsync.upload'), value: '--skip-download' },
    {
      name: tCommon('setting.manualsync.forcedownload'),
      value: '--force-download'
    },
    { name: tCommon('setting.manualsync.forceupload'), value: '--force-upload' }
  ]

  return (
    <>
      {showCloudSaveInfo && (
        <>
          <p
            style={{
              color: autoSyncSaves ? '#07C5EF' : '',
              margin: 0,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            className="iconWithText"
            onMouseEnter={handleOpen}
            aria-owns={open ? 'mouse-over-popover' : undefined}
            aria-haspopup="true"
          >
            <CloudQueue />
            {isSyncing ? (
              <b>{`${tCommon('setting.manualsync.syncing')}... ${tCommon(
                'please-wait'
              )}`}</b>
            ) : (
              <>
                <b>{t('info.syncsaves')}:</b>
                {autoSyncSaves ? t('enabled') : t('disabled')}
              </>
            )}
          </p>

          <Menu
            id="mouse-over-popover"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              onMouseLeave: handleClose,
              style: { pointerEvents: 'auto' }
            }}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left'
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left'
            }}
          >
            {syncCommands.map((command) => (
              <MenuItem
                key={command.value}
                onClick={() => handleSync(command.value as SyncType)}
                disabled={isSyncing}
              >
                {command.name}
              </MenuItem>
            ))}
            <Divider />
            <MenuItem
              onClick={handleOpenFolder}
              disabled={
                gameInfo.runner === 'gog' ? !gogSaves.length : !savesPath
              }
            >
              {t('open-saves-folder', 'Open Saves Folder')}
            </MenuItem>
            <MenuItem style={{ paddingLeft: '4px' }}>
              <ToggleSwitch
                title={tCommon('setting.autosync')}
                htmlId="autosync"
                value={autoSyncSaves}
                handleChange={() => setAutoSyncSaves(!autoSyncSaves)}
              />
            </MenuItem>
          </Menu>
        </>
      )}
      {!showCloudSaveInfo && (
        <p
          style={{
            color: '#F45460'
          }}
          className="iconWithText"
        >
          <CloudOff />
          <b>{t('info.syncsaves')}</b>
          {': '}
          {t('cloud_save_unsupported', 'Unsupported')}
          <InfoIcon
            text={t(
              'help.cloud_save_unsupported',
              'This game does not support cloud saves. This information is provided by the game developers. Some games do implement their own cloud save system'
            )}
          />
        </p>
      )}
    </>
  )
}

export default CloudSavesSync
