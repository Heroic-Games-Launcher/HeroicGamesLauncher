import EventEmitter from 'events'

import type TypedEventEmitter from 'typed-emitter'
import type { GameStatus, RecentGame } from 'common/types'

type BackendEvents = {
  gameStatusUpdate: (payload: GameStatus) => void
  recentGamesChanged: (recentGames: RecentGame[]) => void
  languageChanged: () => void
  settingChanged: (obj: {
    key: string
    oldValue: unknown
    newValue: unknown
  }) => void
  [key: `progressUpdate-${string}`]: (progress: GameStatus) => void
}

// This can be used to emit/listen to events to decouple components
// For example:
//   When the list of recent games changes, a `recentGamesChanged` event is emitted.
//   The `tray_icon` module listens to this event with `backendEvents.on` to update
//   the list of recent games in the tray icon's context menu asynchronously
//
// Usage:
//   Emit events with `backendEvents.emit("eventName", arg1, arg2)
//   Listen to events with `backendEvents.on("eventName", (arg1, arg2) => { ... })
export const backendEvents =
  new EventEmitter() as TypedEventEmitter<BackendEvents>
