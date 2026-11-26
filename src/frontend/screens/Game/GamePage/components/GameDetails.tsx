import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { GameInfo } from 'common/types'
import { DetailList, StoreBadge } from 'frontend/components/UI'
import type { DetailItem } from 'frontend/components/UI/DetailList'
import { getIntlLocale } from 'frontend/helpers'
import { getReleaseDate } from 'frontend/helpers/releaseDate'
import GameContext from '../../GameContext'

interface Props {
  gameInfo: GameInfo
}

const STORE_NAMES: Record<string, string> = {
  legendary: 'Epic Games',
  gog: 'GOG',
  nile: 'Amazon Games',
  zoom: 'ZOOM',
  itchio: 'itch.io',
  sideload: 'Sideloaded'
}

const GameDetails = ({ gameInfo }: Props) => {
  const { t, i18n } = useTranslation('gamepage')
  const { gameExtraInfo, runner, wikiInfo, is } = useContext(GameContext)

  const releaseDate = getReleaseDate(
    wikiInfo?.pcgamingwiki?.releaseDate,
    gameExtraInfo?.releaseDate,
    is,
    getIntlLocale(i18n.language)
  )
  const installPlatform = gameInfo.install.platform

  const items: DetailItem[] = []

  if (gameInfo.developer) {
    items.push({
      label: t('info.developer', 'Developer'),
      value: gameInfo.developer
    })
  }

  if (releaseDate) {
    items.push({
      label: t('label.releaseDate', 'Release date'),
      value: releaseDate
    })
  }

  if (gameInfo.is_installed && installPlatform) {
    items.push({
      label: t('info.installedPlatform', 'Installed platform'),
      value: installPlatform === 'osx' ? 'macOS' : installPlatform
    })
  }

  return (
    <section className="gameDetails">
      <div className="gameDetails__header">
        <h3 className="gameDetails__title">
          {t('game.details', 'Game details')}
        </h3>
        <StoreBadge runner={runner} title={STORE_NAMES[runner] ?? runner} />
      </div>
      <DetailList items={items} />
    </section>
  )
}

export default GameDetails
