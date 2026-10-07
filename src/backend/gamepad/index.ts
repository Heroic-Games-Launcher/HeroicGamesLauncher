import { backendEvents } from 'backend/backend_events'
import { sendFrontendMessage } from 'backend/ipc'

export function initGamepad() {
  backendEvents.on('mainWindowFocussed', () =>
    sendFrontendMessage('gamepad.setInputsEnabled', true)
  )
  backendEvents.on('mainWindowUnfocussed', () =>
    sendFrontendMessage('gamepad.setInputsEnabled', false)
  )
}
