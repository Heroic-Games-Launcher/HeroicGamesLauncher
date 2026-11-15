import { Apple, Globe, Monitor, Store } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { GameInfo, Runner } from 'common/types'
import { Badge } from 'frontend/components/UI'

interface Props {
  gameInfo: GameInfo
  runner: Runner
}

const STORE_NAMES: Record<string, string> = {
  legendary: 'Epic Games',
  gog: 'GOG',
  nile: 'Amazon Games',
  zoom: 'ZOOM',
  itchio: 'itch.io',
  steam: 'Steam',
  sideload: 'Sideloaded'
}

const PLATFORM_LABELS: Record<string, string> = {
  Windows: 'Windows',
  windows: 'Windows',
  Win32: 'Windows',
  Mac: 'macOS',
  osx: 'macOS',
  Linux: 'Linux',
  linux: 'Linux',
  Browser: 'Browser'
}

const PLATFORM_GLYPHS: Record<string, LucideIcon> = {
  macOS: Apple,
  Linux: Monitor,
  Windows: Monitor,
  Browser: Globe
}

const GameBadges = ({ gameInfo, runner }: Props) => {
  const storeLabel = STORE_NAMES[runner] ?? runner
  const rawPlatform = gameInfo.install.platform || 'Windows'
  const platformLabel = PLATFORM_LABELS[rawPlatform] ?? rawPlatform

  return (
    <div className="gamePage__badges">
      <Badge variant="neutral" glyph={Store}>
        {storeLabel}
      </Badge>
      <Badge
        variant="neutral"
        glyph={PLATFORM_GLYPHS[platformLabel] ?? Monitor}
      >
        {platformLabel}
      </Badge>
    </div>
  )
}

export default GameBadges
