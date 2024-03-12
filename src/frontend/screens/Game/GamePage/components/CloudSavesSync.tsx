import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import GameContext from '../../GameContext'
import { CloudOff, CloudQueue } from '@mui/icons-material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { GameInfo } from 'common/types'
import { useGameConfig } from 'frontend/hooks/config'

interface Props {
  gameInfo: GameInfo
}

const CloudSavesSync = ({ gameInfo }: Props) => {
  const { t } = useTranslation('gamepage')
  const { is } = useContext(GameContext)

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
  const [autoSyncSaves] = useGameConfig('autoSyncSaves')

  return (
    <>
      {showCloudSaveInfo && (
        <p
          style={{
            color: autoSyncSaves ? '#07C5EF' : ''
          }}
          className="iconWithText"
        >
          <CloudQueue />
          <b>{t('info.syncsaves')}:</b>
          {autoSyncSaves ? t('enabled') : t('disabled')}
        </p>
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
          <FontAwesomeIcon
            className="helpIcon"
            icon={faCircleInfo}
            title={t(
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
