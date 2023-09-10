import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import GameContext from '../../GameContext'
import { CloudDownload, Storage } from '@mui/icons-material'
import { size } from 'frontend/helpers'
import { GameInfo } from 'common/types'
import ContextProvider from 'frontend/state/ContextProvider'

interface Props {
  gameInfo: GameInfo
}

const DownloadSizeInfo = ({ gameInfo }: Props) => {
  const { t } = useTranslation('gamepage')
  const { gameInstallInfo, runner } = useContext(GameContext)
  const { connectivity } = useContext(ContextProvider)

  if (connectivity.status !== 'online') {
    return null
  }

  if (gameInfo.is_installed) {
    return null
  }

  if (runner === 'sideload') {
    return null
  }

  if (!gameInstallInfo) {
    return null
  }

  if (gameInfo.thirdPartyManagedApp) {
    return null
  }

  if (gameInfo.installable !== undefined && !gameInfo.installable) {
    return null
  }

  const downloadSize =
    gameInstallInfo?.manifest?.download_size &&
    size(Number(gameInstallInfo?.manifest?.download_size))
  const installSize =
    gameInstallInfo?.manifest?.disk_size &&
    size(Number(gameInstallInfo?.manifest?.disk_size))

  return (
    <>
      <div className="iconWithText">
        <CloudDownload />
        <b>{t('game.downloadSize', 'Download Size')}</b>
        {': '}
        {downloadSize ??
          `${t('game.getting-download-size', 'Geting download size')}...`}
      </div>
      <div className="iconWithText">
        <Storage />
        <b>{t('game.installSize', 'Install Size')}</b>
        {': '}
        {installSize ??
          `${t('game.getting-install-size', 'Geting install size')}...`}
      </div>
      <br />
    </>
  )
}

export default DownloadSizeInfo
