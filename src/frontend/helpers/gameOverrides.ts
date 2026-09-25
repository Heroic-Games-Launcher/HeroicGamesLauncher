import type { GameInfo } from 'common/types'

type GameOverride = NonNullable<GameInfo['overrides']>

export const attachGameOverrides = (
  games: GameInfo[],
  overrides: Record<string, GameOverride>
): GameInfo[] => {
  if (!games) return []
  return games.map((game) => {
    const override = overrides[game.app_name]
    if (!override) {
      if (!game.overrides) return game
      const copy = { ...game }
      delete copy.overrides
      return copy
    }
    return { ...game, overrides: override }
  })
}
