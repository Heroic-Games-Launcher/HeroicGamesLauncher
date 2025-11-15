import { backendEvents } from 'backend/backend_events'
import { tsStore } from 'backend/constants/key_value_stores'

import type { Playtime, Runner } from 'common/types'

const defaultPlaytime: Playtime = {
  totalPlayed: 0
}

export default class PlaytimeManager {
  static #instance: PlaytimeManager

  static get(): PlaytimeManager {
    if (!this.#instance) this.#instance = new PlaytimeManager()
    return this.#instance
  }

  init() {
    backendEvents.on(
      'playSessionEnded',
      (game_id, runner, session_start_date) => {
        this.#onPlaySessionEnded(game_id, runner, session_start_date)
      }
    )
  }

  getPlaytime(game_id: string, runner: Runner): Playtime {
    // Add Runner to GameID-only keys. Ideally we'd do this with a migration,
    // but the migration system runs too early (so we can't rely on finding
    // games in the library at that point)
    const playtime_no_runner = tsStore.get_nodefault(game_id) as
      | Playtime
      | undefined
    if (playtime_no_runner) {
      tsStore.set(`${game_id}_${runner}`, playtime_no_runner)
      tsStore.delete(game_id)
    }

    return tsStore.get(`${game_id}_${runner}`, structuredClone(defaultPlaytime))
  }

  updatePlaytime(game_id: string, runner: Runner, playtime: Playtime): void {
    tsStore.set(`${game_id}_${runner}`, playtime)
    backendEvents.emit('playtimeUpdate', game_id, runner, playtime)
  }

  #onPlaySessionEnded(
    game_id: string,
    runner: Runner,
    session_start_date: Date
  ): void {
    const session_end_date = new Date()
    const past_playtime = this.getPlaytime(game_id, runner)

    let new_playtime = structuredClone(past_playtime)
    if (!new_playtime.firstPlayed) {
      new_playtime = {
        ...past_playtime,
        firstPlayed: session_start_date.toISOString(),
        lastPlayed: session_end_date.toISOString()
      }
    } else {
      new_playtime.lastPlayed = session_end_date.toISOString()
    }

    const session_playtime =
      (session_end_date.getTime() - session_start_date.getTime()) / 1000 / 60
    new_playtime.totalPlayed += session_playtime

    this.updatePlaytime(game_id, runner, new_playtime)
  }
}
