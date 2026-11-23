import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CircleCheck,
  CircleHelp,
  CircleSlash,
  TriangleAlert,
  Wine
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { GameInfo } from 'common/types'
import { createNewWindow } from 'frontend/helpers'
import { DetailList, Panel } from 'frontend/components/UI'
import type { DetailItem } from 'frontend/components/UI/DetailList'
import GameContext from '../../GameContext'

interface Props {
  gameInfo: GameInfo
}

const STEAM_DECK_LEVELS: { glyph: LucideIcon; color: string }[] = [
  { glyph: CircleHelp, color: '#a0a5a8' },
  { glyph: CircleSlash, color: '#a0a5a8' },
  { glyph: TriangleAlert, color: '#ffc82c' },
  { glyph: CircleCheck, color: '#58be42' }
]

const CompatibilityInfo = ({ gameInfo }: Props) => {
  const { t } = useTranslation('gamepage')
  const { wikiInfo } = useContext(GameContext)

  const steamInfo = wikiInfo?.steamInfo

  if (!steamInfo) {
    return null
  }

  const hasSteamDeckCompat = Number.isFinite(steamInfo.steamDeckCatagory)
  const items: DetailItem[] = []

  if (steamInfo.compatibilityLevel) {
    const protonDBurl = wikiInfo?.pcgamingwiki?.steamID
      ? `https://www.protondb.com/app/${wikiInfo.pcgamingwiki.steamID}`
      : `https://www.protondb.com/search?q=${gameInfo.title}`

    items.push({
      glyph: Wine,
      label: t('info.protondb-compatibility-info', 'Proton Compatibility Tier'),
      value:
        steamInfo.compatibilityLevel.charAt(0).toUpperCase() +
        steamInfo.compatibilityLevel.slice(1),
      title: t('info.clickToOpen', 'Click to open'),
      onClick: () => createNewWindow(protonDBurl)
    })
  }

  if (hasSteamDeckCompat) {
    const level =
      STEAM_DECK_LEVELS[steamInfo.steamDeckCatagory ?? 3] ??
      STEAM_DECK_LEVELS[0]
    const labels = [
      t('info.steamdeck.unknown', 'Unknown'),
      t('info.steamdeck.unsupported', 'Unsupported'),
      t('info.steamdeck.playable', 'Playable'),
      t('info.steamdeck.verified', 'Verified')
    ]

    items.push({
      glyph: level.glyph,
      label: t('info.steamdeck-compatibility-info', 'SteamDeck Compatibility'),
      value: (
        <span className="steamDeckCompat" style={{ color: level.color }}>
          {labels[steamInfo.steamDeckCatagory ?? 3] ?? labels[0]}
        </span>
      )
    })
  }

  if (!items.length) {
    return null
  }

  return (
    <Panel tone="glass" className="compatibilityInfo">
      <DetailList items={items} />
    </Panel>
  )
}

export default CompatibilityInfo
