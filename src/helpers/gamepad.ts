import { IpcRenderer } from 'electron'
import { GamepadActionStatus } from 'src/types'
const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}
import { VirtualKeyboardController } from './virtualKeyboard'

const KEY_REPEAT_DELAY = 500
const STICK_REPEAT_DELAY = 250
const SCROLL_REPEAT_DELAY = 50

/*
 * For more documentation, check here https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki/Gamepad-Navigation
 */

export const initGamepad = () => {
  // store the current controllers
  let controllers: number[] = []

  let heroicIsFocused = true
  window.addEventListener('focus', () => (heroicIsFocused = true))
  window.addEventListener('blur', () => (heroicIsFocused = false))

  // store the status and metadata for each action
  // triggered is either 0 (inactive) or a unix timestamp of the last `invoke` call
  const actions: GamepadActionStatus = {
    padUp: { triggeredAt: {}, repeatDelay: KEY_REPEAT_DELAY },
    padDown: { triggeredAt: {}, repeatDelay: KEY_REPEAT_DELAY },
    padLeft: { triggeredAt: {}, repeatDelay: KEY_REPEAT_DELAY },
    padRight: { triggeredAt: {}, repeatDelay: KEY_REPEAT_DELAY },
    leftStickUp: { triggeredAt: {}, repeatDelay: STICK_REPEAT_DELAY },
    leftStickDown: { triggeredAt: {}, repeatDelay: STICK_REPEAT_DELAY },
    leftStickLeft: { triggeredAt: {}, repeatDelay: STICK_REPEAT_DELAY },
    leftStickRight: { triggeredAt: {}, repeatDelay: STICK_REPEAT_DELAY },
    rightStickUp: { triggeredAt: {}, repeatDelay: SCROLL_REPEAT_DELAY },
    rightStickDown: { triggeredAt: {}, repeatDelay: SCROLL_REPEAT_DELAY },
    rightStickLeft: { triggeredAt: {}, repeatDelay: SCROLL_REPEAT_DELAY },
    rightStickRight: { triggeredAt: {}, repeatDelay: SCROLL_REPEAT_DELAY },
    mainAction: { triggeredAt: {}, repeatDelay: false },
    back: { triggeredAt: {}, repeatDelay: false },
    altAction: { triggeredAt: {}, repeatDelay: false }
  }

  // check if an action should be triggered
  function checkAction(
    action: string,
    pressed: boolean,
    controllerIndex: number
  ) {
    if (!heroicIsFocused) {
      // ignore gamepad events if heroic is not the focused app
      //
      // the browser still detects the gamepad interactions even
      // if the screen is not focused when playing a game
      return
    }

    const data = actions[action]
    const triggeredAt = data.triggeredAt[controllerIndex]

    if (!pressed) {
      // set 0 if not pressed (means inactive button)
      data.triggeredAt[controllerIndex] = 0
      return
    }

    const now = new Date().getTime()

    // if it the action was already active or not
    const wasActive = triggeredAt !== 0

    let shouldRepeat = false

    if (wasActive) {
      // it it was active, check if the action should be repeated
      if (data.repeatDelay) {
        const lastTriggered = triggeredAt
        if (now - lastTriggered > data.repeatDelay) {
          shouldRepeat = true
        }
      }
    }

    if (!wasActive || shouldRepeat) {
      console.log(`Action: ${action}`)

      // set last trigger timestamp, used for repeater
      data.triggeredAt[controllerIndex] = now

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
    const el = currentElement()
    if (!el) return false

    return el.tagName === 'SELECT'
  }

  function isSearchInput() {
    const el = currentElement()
    if (!el) return false

    return el.classList.contains('searchInput')
  }

  function playable() {
    const el = currentElement()
    if (!el) return false

    const parent = el.parentElement
    if (!parent) return false

    const classes = parent.classList
    const isGameCard =
      classes.contains('gameCard') || classes.contains('gameListItem')
    const isInstalled = classes.contains('installed')
    return isGameCard && isInstalled
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
      if (controller.id.match(/xbox|microsoft|02ea/i)) {
        checkActionsForXbox(buttons, axes, index)
      } else if (controller.id.match(/gamecube|0337/i)) {
        checkActionsForGameCube(buttons, axes, index)
      } else if (controller.id.match(/0ce6/i)) {
        checkActionsForPlayStation5(buttons, axes, index)
      } else if (controller.id.match(/PS3|PLAYSTATION|0268/i)) {
        checkActionsForPlayStation3(buttons, axes, index)
      }
    })

    requestAnimationFrame(updateStatus)
  }

  function connecthandler(e: GamepadEvent) {
    addgamepad(e.gamepad)
  }

  function addgamepad(gamepad: Gamepad) {
    console.log(`Gamepad added: ${JSON.stringify(gamepad.id)}`)
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
    axes: readonly number[],
    controllerIndex: number
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
      // L3 = buttons[10], // press left stick
      // R3 = buttons[11], // press right stick
      up = buttons[12],
      down = buttons[13],
      left = buttons[14],
      right = buttons[15],
      // XBOX = buttons[16],
      leftAxisX = axes[0],
      leftAxisY = axes[1],
      rightAxisX = axes[2],
      rightAxisY = axes[3]

    logState(controllerIndex)

    checkAction('padUp', up.pressed, controllerIndex)
    checkAction('padDown', down.pressed, controllerIndex)
    checkAction('padLeft', left.pressed, controllerIndex)
    checkAction('padRight', right.pressed, controllerIndex)
    checkAction('leftStickLeft', leftAxisX < -0.5, controllerIndex)
    checkAction('leftStickRight', leftAxisX > 0.5, controllerIndex)
    checkAction('leftStickUp', leftAxisY < -0.5, controllerIndex)
    checkAction('leftStickDown', leftAxisY > 0.5, controllerIndex)
    checkAction('rightStickLeft', rightAxisX < -0.5, controllerIndex)
    checkAction('rightStickRight', rightAxisX > 0.5, controllerIndex)
    checkAction('rightStickUp', rightAxisY < -0.5, controllerIndex)
    checkAction('rightStickDown', rightAxisY > 0.5, controllerIndex)
    checkAction('mainAction', A.pressed, controllerIndex)
    checkAction('back', B.pressed, controllerIndex)
    checkAction('altAction', Y.pressed, controllerIndex)
  }

  function checkActionsForGameCube(
    buttons: readonly GamepadButton[],
    axes: readonly number[],
    controllerIndex: number
  ) {
    const A = buttons[0],
      // X = buttons[1],
      Y = buttons[2],
      B = buttons[3],
      // LT = buttons[4],
      // RT = buttons[5],
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

    logState(controllerIndex)

    checkAction('padUp', up.pressed, controllerIndex)
    checkAction('padDown', down.pressed, controllerIndex)
    checkAction('padLeft', left.pressed, controllerIndex)
    checkAction('padRight', right.pressed, controllerIndex)
    checkAction('leftStickLeft', leftAxisX < -0.5, controllerIndex)
    checkAction('leftStickRight', leftAxisX > 0.5, controllerIndex)
    checkAction('leftStickUp', leftAxisY < -0.5, controllerIndex)
    checkAction('leftStickDown', leftAxisY > 0.5, controllerIndex)
    checkAction('rightStickLeft', rightAxisX < -0.5, controllerIndex)
    checkAction('rightStickRight', rightAxisX > 0.5, controllerIndex)
    checkAction('rightStickUp', rightAxisY < -0.5, controllerIndex)
    checkAction('rightStickDown', rightAxisY > 0.5, controllerIndex)
    checkAction('mainAction', A.pressed, controllerIndex)
    checkAction('back', B.pressed, controllerIndex)
    checkAction('altAction', Y.pressed, controllerIndex)
  }

  function checkActionsForPlayStation3(
    buttons: readonly GamepadButton[],
    axes: readonly number[],
    controllerIndex: number
  ) {
    const X = buttons[0],
      Circle = buttons[1],
      // Square = buttons[2],
      Triangle = buttons[3],
      // LB = buttons[4],
      // RB = buttons[5],
      // LT = buttons[6],
      // RT = buttons[7],
      // select = buttons[8],
      // start = buttons[9],
      // L3 = buttons[10], // press left stick
      // R3 = buttons[11], // press right stick
      up = buttons[12],
      down = buttons[13],
      left = buttons[14],
      right = buttons[15],
      // PSButton = buttons[10],
      leftAxisX = axes[0],
      leftAxisY = axes[1],
      rightAxisX = axes[2],
      rightAxisY = axes[3]
    // there are 2 more axes to map as triggers

    logState(controllerIndex)

    checkAction('padUp', up.pressed, controllerIndex)
    checkAction('padDown', down.pressed, controllerIndex)
    checkAction('padLeft', left.pressed, controllerIndex)
    checkAction('padRight', right.pressed, controllerIndex)
    checkAction('leftStickLeft', leftAxisX < -0.5, controllerIndex)
    checkAction('leftStickRight', leftAxisX > 0.5, controllerIndex)
    checkAction('leftStickUp', leftAxisY < -0.5, controllerIndex)
    checkAction('leftStickDown', leftAxisY > 0.5, controllerIndex)
    checkAction('rightStickLeft', rightAxisX < -0.5, controllerIndex)
    checkAction('rightStickRight', rightAxisX > 0.5, controllerIndex)
    checkAction('rightStickUp', rightAxisY < -0.5, controllerIndex)
    checkAction('rightStickDown', rightAxisY > 0.5, controllerIndex)
    checkAction('mainAction', X.pressed, controllerIndex)
    checkAction('back', Circle.pressed, controllerIndex)
    checkAction('altAction', Triangle.pressed, controllerIndex)
  }

  function checkActionsForPlayStation5(
    buttons: readonly GamepadButton[],
    axes: readonly number[],
    controllerIndex: number
  ) {
    const Circle = buttons[0],
      Triangle = buttons[1],
      X = buttons[2],
      // Square = buttons[3],
      // LB = buttons[4],
      // RB = buttons[5],
      rightAxisX = buttons[6],
      rightAxisY = buttons[7],
      // share = buttons[8],
      // menu = buttons[9],
      up = buttons[12],
      down = buttons[13],
      left = buttons[14],
      right = buttons[15],
      leftAxisX = axes[0],
      leftAxisY = axes[1]
    // there are 2 more axes to map as triggers

    logState(controllerIndex)

    checkAction('padUp', up.pressed, controllerIndex)
    checkAction('padDown', down.pressed, controllerIndex)
    checkAction('padLeft', left.pressed, controllerIndex)
    checkAction('padRight', right.pressed, controllerIndex)
    checkAction('leftStickLeft', leftAxisX < -0.5, controllerIndex)
    checkAction('leftStickRight', leftAxisX > 0.5, controllerIndex)
    checkAction('leftStickUp', leftAxisY < -0.5, controllerIndex)
    checkAction('leftStickDown', leftAxisY > 0.5, controllerIndex)
    checkAction('rightStickLeft', rightAxisX.value < 0.25, controllerIndex)
    checkAction('rightStickRight', rightAxisX.value > 0.75, controllerIndex)
    checkAction('rightStickUp', rightAxisY.value < 0.25, controllerIndex)
    checkAction('rightStickDown', rightAxisY.value > 0.75, controllerIndex)
    checkAction('mainAction', X.pressed, controllerIndex)
    checkAction('back', Circle.pressed, controllerIndex)
    checkAction('altAction', Triangle.pressed, controllerIndex)
  }

  function logState(index: number) {
    const controller = navigator.getGamepads()[index]
    if (!controller) return

    const buttons = controller.buttons
    const axes = controller.axes

    for (const button in buttons) {
      if (buttons[button].pressed)
        console.log(`button ${button} pressed ${buttons[button].value}`)
    }
    for (const axis in axes) {
      if (axes[axis] < -0.5) console.log(`axis ${axis} activated negative`)
      if (axes[axis] > 0.5) console.log(`axis ${axis} activated positive`)
    }
  }

  window.addEventListener('gamepadconnected', connecthandler)
  window.addEventListener('gamepaddisconnected', disconnecthandler)
}
