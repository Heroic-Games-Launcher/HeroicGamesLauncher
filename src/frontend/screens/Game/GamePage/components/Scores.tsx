import { useContext } from 'react'
import GameContext from '../../GameContext'
import GameScore from 'frontend/components/UI/WikiGameInfo/components/GameScore'
import { createNewWindow } from 'frontend/helpers'
import { RatingEntry, GameInfo } from 'common/types'
import classNames from 'classnames'

interface Props {
  gameInfo: GameInfo
  externalRating: RatingEntry | null
}

const Scores = ({ gameInfo, externalRating }: Props) => {
  const { wikiInfo } = useContext(GameContext)

  const pcgamingwiki = wikiInfo?.pcgamingwiki

  const hasScores =
    pcgamingwiki?.metacritic.score ||
    pcgamingwiki?.igdb.score ||
    pcgamingwiki?.opencritic.score

  const externalScore =
    externalRating?.status === 'ok' && typeof externalRating.score === 'number'
      ? externalRating.score
      : null

  if (!hasScores && externalScore === null) {
    return null
  }

  return (
    <>
      {hasScores && pcgamingwiki && (
        <GameScore info={pcgamingwiki} title={gameInfo.title} />
      )}
      {externalScore !== null && (
        <div className="gamescore">
          <button
            type="button"
            className={classNames(
              'circle',
              externalScore > 66
                ? 'green'
                : externalScore < 33
                  ? 'red'
                  : 'yellow'
            )}
            onClick={() => {
              if (externalRating?.url) createNewWindow(externalRating.url)
            }}
            aria-label={`Open RAWG rating for ${gameInfo.title}`}
          >
            <div className="circle__title">MetaCritic</div>
            <div className="circle__value">{externalScore}</div>
          </button>
        </div>
      )}
    </>
  )
}

export default Scores
