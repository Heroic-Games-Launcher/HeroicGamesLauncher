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
        const isHiddenAchievement = !x.visible && !x.date_unlocked
        return (
          <div
            className={`achievement-item ${x.date_unlocked ? 'unlocked' : 'locked'} ${isHiddenAchievement ? 'hidden-achievement' : ''}`}
            key={key}
          >
            <div
              className={`achievement-icon rarity-${x.rarity_level_slug} ${!x.date_unlocked}`}
            >
              <img
                src={
                  x.date_unlocked ? x.image_url_unlocked : x.image_url_locked
                }
              />
            </div>
            <div className="achievement-text">
              <span className="achievement-title">
                {isHiddenAchievement ? 'Hidden Achievement' : x.name}
              </span>
              <span className="achievement-desc">
                {isHiddenAchievement ? '' : x.description}
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
