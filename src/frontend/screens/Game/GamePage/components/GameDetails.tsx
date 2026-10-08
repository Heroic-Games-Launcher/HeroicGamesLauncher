import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Code2, MonitorPlay, Tags } from 'lucide-react'
import { GameInfo } from 'common/types'
import { DetailList, Panel, StoreBadge } from 'frontend/components/UI'
import type { DetailItem } from 'frontend/components/UI/DetailList'
import { getReleaseDate } from 'frontend/helpers/releaseDate'
import GameContext from '../../GameContext'

interface Props {
  gameInfo: GameInfo
}

const STORE_NAMES: Record<string, string> = {
  legendary: 'Epic Games',
  gog: 'GOG',
  nile: 'Amazon Games',
  sideload: 'Sideloaded'
}

const GameDetails = ({ gameInfo }: Props) => {
  const { t } = useTranslation('gamepage')
  const { gameExtraInfo, runner, wikiInfo, is } = useContext(GameContext)

  const genres = gameExtraInfo?.genres || wikiInfo?.pcgamingwiki?.genres || []
  const releaseDate = getReleaseDate(
    wikiInfo?.pcgamingwiki?.releaseDate,
    gameExtraInfo?.releaseDate,
    is
  )
  const installPlatform = gameInfo.install.platform

  const items: DetailItem[] = []

  if (gameInfo.developer) {
    items.push({
      glyph: Code2,
      label: t('info.developer', 'Developer'),
      value: gameInfo.developer
    })
  }

  if (releaseDate) {
    items.push({
      glyph: CalendarDays,
      label: t('label.releaseDate', 'Release Date'),
      value: releaseDate
    })
  }

  if (genres.length && genres[0] !== '') {
    items.push({
      glyph: Tags,
      label: t('info.genres', 'Genres'),
      value: genres.join(', ')
    })
  }

  if (gameInfo.is_installed && installPlatform) {
    items.push({
      glyph: MonitorPlay,
      label: t('info.installedPlatform', 'Installed Platform'),
      value: installPlatform === 'osx' ? 'macOS' : installPlatform
    })
  }

  return (
    <Panel tone="glass" className="gameDetails">
      <div className="gameDetails__header">
        <h3 className="gameDetails__title">
          {t('game.details', 'Game Details')}
        </h3>
        <StoreBadge runner={runner} title={STORE_NAMES[runner] ?? runner} />
      </div>
      <DetailList items={items} />
    </Panel>
  )
}

export default GameDetails
