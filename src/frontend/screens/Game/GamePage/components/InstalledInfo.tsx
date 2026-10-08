import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FolderOpen,
  HardDrive,
  MonitorPlay,
  Package,
  Tag as TagGlyph,
  Wifi,
  Wine
} from 'lucide-react'
import { GameInfo } from 'common/types'
import { DetailList, Panel } from 'frontend/components/UI'
import type { DetailItem } from 'frontend/components/UI/DetailList'
import GameContext from '../../GameContext'

interface Props {
  gameInfo: GameInfo
}

const InstalledInfo = ({ gameInfo }: Props) => {
  const { t } = useTranslation('gamepage')
  const { t: t2 } = useTranslation()
  const { gameSettings, runner, is } = useContext(GameContext)

  if (!gameInfo.is_installed || !gameSettings) {
    return null
  }

  const isSideloaded = runner === 'sideload'
  const isThirdParty = !!gameInfo.thirdPartyManagedApp

  const {
    install: { platform: installPlatform },
    canRunOffline,
    folder_name
  } = gameInfo

  const items: DetailItem[] = []

  if (installPlatform === 'Browser') {
    items.push({
      glyph: MonitorPlay,
      label: t('info.installedPlatform', 'Installed Platform'),
      value: installPlatform
    })

    return (
      <Panel tone="glass" className="installationInfo">
        <DetailList items={items} columns={2} />
      </Panel>
    )
  }

  const install_path = isSideloaded ? undefined : gameInfo.install.install_path
  const install_size = isSideloaded ? undefined : gameInfo.install.install_size
  const version = isSideloaded ? undefined : gameInfo.install.version
  const appLocation = install_path || folder_name

  if (!isSideloaded && !isThirdParty && install_size) {
    items.push({
      glyph: HardDrive,
      label: t('info.size'),
      value: install_size
    })
  }

  items.push({
    glyph: MonitorPlay,
    label: t('info.installedPlatform', 'Installed Platform'),
    value: installPlatform === 'osx' ? 'macOS' : installPlatform
  })

  if (!isSideloaded && !isThirdParty && version) {
    items.push({
      glyph: TagGlyph,
      label: t('info.version'),
      value: version
    })
  }

  items.push({
    glyph: Wifi,
    label: t('info.canRunOffline', 'Online Required'),
    value: t(canRunOffline ? 'box.no' : 'box.yes')
  })

  if (isThirdParty) {
    items.push({
      glyph: Package,
      label: t('info.third-party-app', 'Third-Party Manager'),
      value: gameInfo.isEAManaged ? 'EA app' : gameInfo.thirdPartyManagedApp
    })
  } else if (appLocation) {
    items.push({
      glyph: FolderOpen,
      label: t('info.path'),
      value: <span className="truncatedPath">{appLocation}</span>,
      title: t('info.clickToOpen', 'Click to open'),
      onClick: () => window.api.openFolder(appLocation)
    })
  }

  if (!is.win && !is.native) {
    const { wineVersion, winePrefix, wineCrossoverBottle } = gameSettings
    let wineName = wineVersion.name
      .replace('Wine - ', '')
      .replace('Proton - ', '')
    if (wineName.includes('Default')) {
      wineName = wineName.split('-')[0]
    }

    items.push({ glyph: Wine, label: 'Wine', value: wineName })

    if (wineVersion.type === 'crossover') {
      items.push({
        glyph: Wine,
        label: t2('setting.winecrossoverbottle', 'Bottle'),
        value: wineCrossoverBottle
      })
    } else {
      items.push({
        glyph: FolderOpen,
        label: t2('setting.wineprefix', 'WinePrefix'),
        value: <span className="truncatedPath">{winePrefix}</span>,
        title: t('info.clickToOpen', 'Click to open'),
        onClick: () => window.api.openFolder(winePrefix)
      })
    }
  }

  return (
    <Panel tone="glass" className="installationInfo">
      <DetailList items={items} columns={2} />
    </Panel>
  )
}

export default InstalledInfo
