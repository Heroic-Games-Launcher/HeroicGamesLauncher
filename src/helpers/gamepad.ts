import { IpcRenderer } from 'electron'
import { GamepadActionStatus } from 'src/types'
const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}
import { VirtualKeyboardController } from './virtualKeyboard'

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
    mainAction: { triggered: 0, repeatDelay: false },
    back: { triggered: 0, repeatDelay: false },
    altAction: { triggered: 0, repeatDelay: false }
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

      switch (action) {
        case 'mainAction':
          if (shouldSimulateClick()) {
            // some tags require a simulated click, some require a javascript click() call
            // if the current element requires a simulated click, change the action to `leftClick`
            action = 'leftClick'
          } else if (playable()) {
            // if the current element a card of a game that can be played, play it
            playGame()
            return
          } else if (VirtualKeyboardController.isButtonFocused()) {
            // simulate a left click on a virtual keyboard button
            action = 'leftClick'
          } else if (isSearchInput()) {
            // open virtual keyboard if focusing the search input
            VirtualKeyboardController.initOrFocus()
            return
          }
          break
        case 'back':
          // `back` closes the keyboard if present
          if (VirtualKeyboardController.isActive()) {
            VirtualKeyboardController.destroy()
            return
          }
          break
        case 'altAction':
          if (playable()) {
            // when pressing Y on a game card, open the game details
            action = 'mainAction'
          } else if (VirtualKeyboardController.isActive()) {
            VirtualKeyboardController.backspace()
            return
          }
          break
      }

      if (action === 'mainAction') {
        currentElement()?.click()
      } else {
        // we have to tell Electron to simulate key presses
        // so the spatial navigation works
        ipcRenderer.invoke('gamepadAction', [action, metadata()])
      }
    }
  }

  function currentElement() {
    return document.querySelector(':focus') as HTMLElement
  }

  function shouldSimulateClick() {
    return isSelect()
  }

  function isSelect() {
    return currentElement().tagName === 'SELECT'
  }

  function isSearchInput() {
    return currentElement().classList.contains('searchInput')
  }

  function playable() {
    const el = currentElement()
    if (!el) return false

    const parent = el.parentElement
    if (!parent) return false

    const classes = parent.classList
    return classes.contains('gameCard') || classes.contains('gameListItem')
  }

  function playGame() {
    const el = currentElement()
    if (!el) return false

    const parent = el.parentElement
    if (!parent) return false

    const playButton = parent.querySelector('.playButton') as HTMLButtonElement
    if (playButton) playButton.click()

    return true
  }

  function metadata() {
    const el = currentElement()
    if (el) {
      const rect = el.getBoundingClientRect()
      return {
        elementTag: el.tagName,
        x: Math.round(rect.x + rect.width / 2),
        y: Math.round(rect.y + rect.height / 2)
      }
    } else {
      return null
    }
  }

  // check all the buttons and axes every frame
  function updateStatus() {
    const gamepads = navigator.getGamepads()

    controllers.forEach((index) => {
      const controller = gamepads[index]
      if (!controller) return

      const buttons = controller.buttons
      const axes = controller.axes
      if (controller.id.match(/xbox|microsoft/i)) {
        checkActionsForXbox(buttons, axes)
      } else if (controller.id.match(/gamecube/i)) {
        checkActionsForGameCube(buttons, axes)
      } else if (controller.id.match(/PS3|PS4|PS5|PLAYSTATION/i)) {
        checkActionsForPlayStation(buttons, axes)
      }
    })

    requestAnimationFrame(updateStatus)
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

  function checkActionsForXbox(
    buttons: readonly GamepadButton[],
    axes: readonly number[]
  ) {
    const A = buttons[0],
      B = buttons[1],
      // X = buttons[2],
      Y = buttons[3],
      // LB = buttons[4],
      // RB = buttons[5],
      // LT = buttons[6], // has .value
      // RT = buttons[7], // has .value
      // view = buttons[8],
      // menu = buttons[9],
      // leftStick = buttons[10], // press
      // rightStick = buttons[11], // press
      up = buttons[12],
      down = buttons[13],
      left = buttons[14],
      right = buttons[15],
      // XBOX = buttons[16],
      leftAxisX = axes[0],
      leftAxisY = axes[1],
      rightAxisX = axes[2],
      rightAxisY = axes[3]

    checkAction('padUp', up.pressed)
    checkAction('padDown', down.pressed)
    checkAction('padLeft', left.pressed)
    checkAction('padRight', right.pressed)
    checkAction('leftStickLeft', leftAxisX < -0.5)
    checkAction('leftStickRight', leftAxisX > 0.5)
    checkAction('leftStickUp', leftAxisY < -0.5)
    checkAction('leftStickDown', leftAxisY > 0.5)
    checkAction('rightStickLeft', rightAxisX < -0.5)
    checkAction('rightStickRight', rightAxisX > 0.5)
    checkAction('rightStickUp', rightAxisY < -0.5)
    checkAction('rightStickDown', rightAxisY > 0.5)
    checkAction('mainAction', A.pressed)
    checkAction('back', B.pressed)
    checkAction('altAction', Y.pressed)
  }

  function checkActionsForGameCube(
    buttons: readonly GamepadButton[],
    axes: readonly number[]
  ) {
    // B0: A
    // B1: X
    // B2: Y
    // B3: B
    // B4: LT (gets "pressed" once the trigger presses all the way down, there's some resistance on the controller so you can feel it)
    // B5: RT
    // B6: Z
    // B7: Start
    // B8: Dpad Up
    // B9: Dpad Down
    // B10: Dpad Left
    // B11: Dpad Right
    // Axis 0: Control stick L/R
    // -1 -> Left
    // 1 -> Right
    // Axis 1: Control stick Up/Down
    // -1 -> Up
    // 1 -> Down
    // Axis 2: Left trigger
    // -1 -> Up (default position
    // 1 -> Pressed in all the way
    // Axis 3 and 4 work like 0 and 1 just for the C stick
    // Axis 5 works like Axis 2 just for the right trigger

    const A = buttons[0],
      // X = buttons[1],
      Y = buttons[2],
      B = buttons[3],
      // LT = buttons[4], // has .value
      // RT = buttons[5], // has .value
      // Z = buttons[6],
      // Start = buttons[7],
      up = buttons[8],
      down = buttons[9],
      left = buttons[10],
      right = buttons[11],
      leftAxisX = axes[0],
      leftAxisY = axes[1],
      rightAxisX = axes[3],
      rightAxisY = axes[4]
    // there are 2 more axes to map as triggers

    checkAction('padUp', up.pressed)
    checkAction('padDown', down.pressed)
    checkAction('padLeft', left.pressed)
    checkAction('padRight', right.pressed)
    checkAction('leftStickLeft', leftAxisX < -0.5)
    checkAction('leftStickRight', leftAxisX > 0.5)
    checkAction('leftStickUp', leftAxisY < -0.5)
    checkAction('leftStickDown', leftAxisY > 0.5)
    checkAction('rightStickLeft', rightAxisX < -0.5)
    checkAction('rightStickRight', rightAxisX > 0.5)
    checkAction('rightStickUp', rightAxisY < -0.5)
    checkAction('rightStickDown', rightAxisY > 0.5)
    checkAction('mainAction', A.pressed)
    checkAction('back', B.pressed)
    checkAction('altAction', Y.pressed)
  }

  function checkActionsForPlayStation(
    buttons: readonly GamepadButton[],
    axes: readonly number[]
  ) {
    // B0: X
    // B1: Circle
    // B2: Triangle
    // B3: Square
    // B4: LB
    // B5: RB
    // B6: LT (gets "pressed" as soon as the trigger is moved down slightly)
    // B7: RT
    // B8: Select
    // B9: Start
    // B10: PS Button
    // B11: L3 (pressing in the control sticks)
    // B12: R3
    // B13: Dpad Up
    // B14: Dpad Down
    // B15: Dpad Left
    // B16: Dpad Right

    // Axis 0: Left control stick L/R
    // 1 -> Right
    // -1 -> Left
    // Axis 1: Left control stick Up/Down
    // 1 -> Down
    // -1 -> Up
    // Axis 2: Left Trigger
    // -1 -> Up
    // 1 -> Down
    // Axis 3, 4 & 5 work the same way as 0, 1 & 2, just for the right side of the controller

    const X = buttons[0],
      Circle = buttons[1],
      Triangle = buttons[2],
      // Square = buttons[3],
      // LB = buttons[4],
      // RB = buttons[5],
      // LT = buttons[6], // has .value
      // RT = buttons[7], // has .value
      // select = buttons[8],
      // start = buttons[9],
      // PSButton = buttons[10],
      // leftStick = buttons[11], // press
      // rightStick = buttons[12], // press
      up = buttons[13],
      down = buttons[14],
      left = buttons[15],
      right = buttons[16],
      leftAxisX = axes[0],
      leftAxisY = axes[1],
      rightAxisX = axes[3],
      rightAxisY = axes[4]
    // there are 2 more axes to map as triggers

    checkAction('padUp', up.pressed)
    checkAction('padDown', down.pressed)
    checkAction('padLeft', left.pressed)
    checkAction('padRight', right.pressed)
    checkAction('leftStickLeft', leftAxisX < -0.5)
    checkAction('leftStickRight', leftAxisX > 0.5)
    checkAction('leftStickUp', leftAxisY < -0.5)
    checkAction('leftStickDown', leftAxisY > 0.5)
    checkAction('rightStickLeft', rightAxisX < -0.5)
    checkAction('rightStickRight', rightAxisX > 0.5)
    checkAction('rightStickUp', rightAxisY < -0.5)
    checkAction('rightStickDown', rightAxisY > 0.5)
    checkAction('mainAction', X.pressed)
    checkAction('back', Circle.pressed)
    checkAction('altAction', Triangle.pressed)
  }

  window.addEventListener('gamepadconnected', connecthandler)
  window.addEventListener('gamepaddisconnected', disconnecthandler)
}
