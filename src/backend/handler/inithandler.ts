import { initGameStatusHandler } from './gamestatus/gamestatushandler'

export function initAllHandlers() {
  initGameStatusHandler()
}

// For other handlers that needs deinit
// export function deinitAllHandlers() {

// }
