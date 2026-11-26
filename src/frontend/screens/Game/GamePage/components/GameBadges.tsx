import { GameInfo } from 'common/types'
import { Badge } from 'frontend/components/UI'

interface Props {
  gameInfo: GameInfo
  genres: string[]
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

const GameBadges = ({ gameInfo, genres }: Props) => {
  const rawPlatform = gameInfo.install.platform || 'Windows'
  const platformLabel = PLATFORM_LABELS[rawPlatform] ?? rawPlatform
  const visibleGenres = genres.filter((genre) => genre.trim() !== '')

  return (
    <div className="gamePage__badges">
      <Badge variant="strong">{platformLabel}</Badge>
      {visibleGenres.map((genre) => (
        <Badge key={genre} variant="neutral">
          {genre}
        </Badge>
      ))}
    </div>
  )
}

export default GameBadges
