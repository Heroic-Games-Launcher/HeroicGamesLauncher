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
    rightClick: { triggered: 0, repeatDelay: false },
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

      if (!controller) return

      // TODO: check the controller type and define different buttons and axes
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
        leftAxisX = controller.axes[0],
        leftAxisY = controller.axes[1],
        rightAxisX = controller.axes[2],
        rightAxisY = controller.axes[3]

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

  window.addEventListener('gamepadconnected', connecthandler)
  window.addEventListener('gamepaddisconnected', disconnecthandler)
}
