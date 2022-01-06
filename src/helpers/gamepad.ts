import { IpcRenderer } from 'electron'
import { GamepadActionStatus } from 'src/types'
const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}

const KEY_REPEAT_DELAY = 500
const STICK_REPEAT_DELAY = 250
const SCROLL_REPEAT_DELAY = 50

export const initGamepad = () => {
  // store the current controllers
  let controllers: number[] = []

  // store the status and metadata for each action
  // triggered is either 0 (inactive) or a unix timestamp of the last `invoke` call
  const actions: GamepadActionStatus = {
    padUp: { triggered: 0, repeatDelay: KEY_REPEAT_DELAY },
    padDown: { triggered: 0, repeatDelay: KEY_REPEAT_DELAY },
    padLeft: { triggered: 0, repeatDelay: KEY_REPEAT_DELAY },
    padRight: { triggered: 0, repeatDelay: KEY_REPEAT_DELAY },
    leftStickUp: { triggered: 0, repeatDelay: STICK_REPEAT_DELAY },
    leftStickDown: { triggered: 0, repeatDelay: STICK_REPEAT_DELAY },
    leftStickLeft: { triggered: 0, repeatDelay: STICK_REPEAT_DELAY },
    leftStickRight: { triggered: 0, repeatDelay: STICK_REPEAT_DELAY },
    rightStickUp: { triggered: 0, repeatDelay: SCROLL_REPEAT_DELAY },
    rightStickDown: { triggered: 0, repeatDelay: SCROLL_REPEAT_DELAY },
    rightStickLeft: { triggered: 0, repeatDelay: SCROLL_REPEAT_DELAY },
    rightStickRight: { triggered: 0, repeatDelay: SCROLL_REPEAT_DELAY },
    mainAction: { triggered: 0, repeatDelay: false }
  }

  // check if an action should be triggered
  function checkAction(action: string, pressed: boolean) {
    if (!pressed) {
      // set 0 if not pressed (means inactive button)
      actions[action].triggered = 0
      return
    }

    const now = new Date().getTime()

    // if it the action was already active or not
    const wasActive = actions[action].triggered !== 0
    let shouldRepeat = false

    if (wasActive) {
      // it it was active, check if the action should be repeated
      if (actions[action].repeatDelay) {
        const lastTriggered = actions[action].triggered
        if (now - lastTriggered > actions[action].repeatDelay) {
          shouldRepeat = true
        }
      }
    }

    if (!wasActive || shouldRepeat) {
      // set last trigger timestamp, used for repeater
      actions[action].triggered = now

      if (action === 'mainAction') {
        currentElement()?.click()
      } else {
        // we have to tell Electron to simulate key presses
        // so the spatial navigation works
        ipcRenderer.invoke('gamepadAction', action)
      }
    }
  }

  // check all the buttons and axes every frame
  function updateStatus() {
    const gamepads = navigator.getGamepads()

    controllers.forEach((index) => {
      const controller = gamepads[index]

      if (!controller) return

      // TODO: check the controller type and define different buttons and axes
      const buttons = {
        up: controller.buttons[12] as GamepadButton,
        down: controller.buttons[13] as GamepadButton,
        left: controller.buttons[14] as GamepadButton,
        right: controller.buttons[15] as GamepadButton,
        A: controller.buttons[0] as GamepadButton
      }
      const leftAxisX = controller.axes[0] as number
      const leftAxisY = controller.axes[1] as number
      const rightAxisX = controller.axes[2] as number
      const rightAxisY = controller.axes[3] as number

      checkAction('padUp', buttons.up.pressed)
      checkAction('padDown', buttons.down.pressed)
      checkAction('padLeft', buttons.left.pressed)
      checkAction('padRight', buttons.right.pressed)
      checkAction('leftStickLeft', leftAxisX < -0.5)
      checkAction('leftStickRight', leftAxisX > 0.5)
      checkAction('leftStickUp', leftAxisY < -0.5)
      checkAction('leftStickDown', leftAxisY > 0.5)
      checkAction('rightStickLeft', rightAxisX < -0.5)
      checkAction('rightStickRight', rightAxisX > 0.5)
      checkAction('rightStickUp', rightAxisY < -0.5)
      checkAction('rightStickDown', rightAxisY > 0.5)
      checkAction('mainAction', buttons['A'].pressed)
    })

    requestAnimationFrame(updateStatus)
  }

  function currentElement() {
    return document?.querySelector(':focus') as HTMLElement
  }

  function connecthandler(e: GamepadEvent) {
    addgamepad(e.gamepad)
  }

  function addgamepad(gamepad: Gamepad) {
    controllers.push(gamepad.index)
    requestAnimationFrame(updateStatus)
  }

  function disconnecthandler(e: GamepadEvent) {
    removegamepad(e.gamepad)
  }

  function removegamepad(gamepad: Gamepad) {
    controllers = controllers.filter((idx) => idx !== gamepad.index)
  }

  window.addEventListener('gamepadconnected', connecthandler)
  window.addEventListener('gamepaddisconnected', disconnecthandler)
}
