import { GameAchievement } from 'common/types'

interface Props {
  achievements: GameAchievement[]
}

const Achievements = ({ achievements }: Props) => {
  const unlocked = achievements
    .filter((x) => x.date_unlocked !== null)
    .sort(
      (a, b) =>
        new Date(b.date_unlocked || '').getTime() -
        new Date(a.date_unlocked || '').getTime()
    )
  const locked = achievements
    .filter((x) => x.date_unlocked === null)
    .sort((a, b) => b.rarity - a.rarity)

  return (
    <div className="achievement-container">
      {[...unlocked, ...locked].map((x: GameAchievement, key: number) => {
        return (
          <div className="achievement-item" key={key}>
            <img
              className={`achievement-icon rarity-${x.rarity_level_slug}`}
              src={x.date_unlocked ? x.image_url_unlocked : x.image_url_locked}
            />
            <div
              className={`achievement-text ${x.date_unlocked ? 'unlocked' : 'locked'}`}
            >
              <span className="achievement-title">
                {x.visible ? x.name : 'Hidden Achievement'}
              </span>
              <span className="achievement-desc">
                {x.visible ? x.description : ''}
              </span>
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
