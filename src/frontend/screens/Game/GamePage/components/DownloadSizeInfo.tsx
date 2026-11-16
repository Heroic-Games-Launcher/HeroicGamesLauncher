import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { CloudDownload, HardDrive, Package } from 'lucide-react'
import { GameInfo } from 'common/types'
import { size } from 'frontend/helpers'
import { DetailList, Panel } from 'frontend/components/UI'
import type { DetailItem } from 'frontend/components/UI/DetailList'
import ContextProvider from 'frontend/state/ContextProvider'
import GameContext from '../../GameContext'

interface Props {
  gameInfo: GameInfo
}

const DownloadSizeInfo = ({ gameInfo }: Props) => {
  const { t } = useTranslation('gamepage')
  const { gameInstallInfo, runner } = useContext(GameContext)
  const { connectivity } = useContext(ContextProvider)

  if (
    connectivity.status !== 'online' ||
    gameInfo.is_installed ||
    runner === 'sideload'
  ) {
    return null
  }

  if (gameInfo.thirdPartyManagedApp) {
    return (
      <Panel tone="glass" className="downloadSizeInfo">
        <DetailList
          items={[
            {
              glyph: Package,
              label: t('info.third-party-app', 'Third-Party Manager'),
              value: gameInfo.isEAManaged
                ? 'EA app'
                : gameInfo.thirdPartyManagedApp
            }
          ]}
        />
      </Panel>
    )
  }

  const downloadSize = gameInstallInfo?.manifest?.download_size
  const installSize = gameInstallInfo?.manifest?.disk_size

  const items: DetailItem[] = [
    {
      glyph: CloudDownload,
      label: t('game.downloadSize', 'Download Size'),
      value: downloadSize
        ? size(Number(downloadSize))
        : `${t('game.getting-download-size', 'Geting download size')}...`
    },
    {
      glyph: HardDrive,
      label: t('game.installSize', 'Install Size'),
      value: installSize
        ? size(Number(installSize))
        : `${t('game.getting-install-size', 'Geting install size')}...`
    }
  ]

  return (
    <Panel tone="glass" className="downloadSizeInfo">
      <DetailList items={items} columns={2} />
    </Panel>
  )
}

export default DownloadSizeInfo
