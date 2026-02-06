import { GameInfo } from 'common/types'

interface Props {
  gameInfo: GameInfo
}

const Achievements = ({ gameInfo }: Props) => {
  const { achievements } = gameInfo

  if (!achievements || achievements.length === 0)
    return <div className="achievement-container" />

  achievements.sort((a, b) => b.rarity - a.rarity)
  achievements.sort(
    (a, b) =>
      new Date(b.date_unlocked || '').getTime() -
      new Date(a.date_unlocked || '').getTime()
  )

  return (
    <div className="achievement-container">
      {achievements.map((x, key) => {
        return (
          <div className="achievement-item" key={key}>
            <img
              className={`achievement-icon rarity-${x.rarity_level_slug}`}
              src={x.date_unlocked ? x.image_url_unlocked : x.image_url_locked}
            />
            <div
              className={`achievement-text ${x.date_unlocked ? 'unlocked' : 'locked'}`}
            >
              <span className="achievement-title">{x.name}</span>
              <span className="achievement-desc">{x.description}</span>
              <span className="achievement-rarity">
                {x.rarity_level_description} · {x.rarity}%
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default Achievements
