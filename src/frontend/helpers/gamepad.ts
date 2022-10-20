import { AppSettings, GamepadActionStatus } from 'common/types'
import {
  checkGameCube,
  checkPS3,
  checkPS5,
  checkPS3Clone1,
  checkXbox,
  checkN64Clone1,
  checkGenius1
} from './gamepad_layouts'
import { VirtualKeyboardController } from './virtualKeyboard'

const KEY_REPEAT_DELAY = 500
const STICK_REPEAT_DELAY = 250
const SCROLL_REPEAT_DELAY = 50

/*
 * For more documentation, check here https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki/Gamepad-Navigation
 */

let controllerIsDisabled = false
let currentController = -1

export const initGamepad = () => {
  window.api
    .requestSettings('default')
    .then(({ disableController }: AppSettings) => {
      controllerIsDisabled = disableController || false
    })

  // store the current controllers
  let controllers: number[] = []

  let heroicIsFocused = true
  window.addEventListener('focus', () => (heroicIsFocused = true))
  window.addEventListener('blur', () => (heroicIsFocused = false))

  // store the status and metadata for each action
  // triggeredAt is a hash with controllerIndex as keys and a timestamp or 0 (inactive)
  // this keeps track of the moment a button/trigger/stick is activated
  // we use this to know when to fire events
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
    altAction: { triggeredAt: {}, repeatDelay: false },
    rightClick: { triggeredAt: {}, repeatDelay: false }
  }

  // check if an action should be triggered
  function checkAction(
    action: string,
    pressed: boolean,
    controllerIndex: number
  ) {
    if (controllerIsDisabled) return

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

    // check if the action was already active or not
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

      // set last triggeredAt timestamp, used for repeater
      data.triggeredAt[controllerIndex] = now

      emitControllerEvent(controllerIndex)

      // check special cases for the different actions, more details on the wiki
      switch (action) {
        case 'mainAction':
          if (shouldSimulateClick()) {
            // some tags require a simulated click, some require a javascript click() call
            // if the current element requires a simulated click, change the action to `leftClick`
            action = 'leftClick'
          } else if (playable()) {
            // if the current element is a card of a game and it's installed, play it
            playGame()
            return
          } else if (isGameCard()) {
            installGame()
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
          if (VirtualKeyboardController.isActive()) {
            // closes the keyboard if present
            VirtualKeyboardController.destroy()
            return
          } else if (isSelect()) {
            // closes the select dropdown and re-focus element
            const el = currentElement()
            el?.blur()
            el?.focus()
            return
          } else if (insideInstallDialog()) {
            closeInstallDialog()
          }
          break
        case 'altAction':
          if (isGameCard()) {
            // when pressing Y on a game card, open the game details
            action = 'mainAction'
          } else if (VirtualKeyboardController.isActive()) {
            VirtualKeyboardController.space()
            return
          }
          break
        case 'rightClick':
          if (VirtualKeyboardController.isActive()) {
            VirtualKeyboardController.backspace()
            return
          }
      }

      if (action === 'mainAction') {
        currentElement()?.click()
      } else {
        // we have to tell Electron to simulate key presses
        // so the spatial navigation works
        const metadataReturn = metadata()
        if (metadataReturn) window.api.gamepadAction([action, metadataReturn])
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

    // only change this if you change the id of the input element
    // in /src/frontend/components/UI/SearchBar/index.tsx
    return el.id === 'search'
  }

  function isGameCard() {
    const el = currentElement()
    if (!el) return false

    const parent = el.parentElement
    if (!parent) return false

    return parent.classList.contains('gameCard')
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

    const playButton = parent.querySelector('.playIcon') as HTMLButtonElement
    if (playButton) playButton.click()

    return true
  }

  function installGame() {
    const el = currentElement()
    if (!el) return false

    const parent = el.parentElement
    if (!parent) return false

    const installButton = parent.querySelector('.downIcon') as HTMLButtonElement
    if (installButton) installButton.click()

    return true
  }

  function insideInstallDialog() {
    const el = currentElement()
    if (!el) return false

    return !!el.closest('.InstallModal__dialog')
  }

  function closeInstallDialog() {
    const el = currentElement()
    if (!el) return false

    const dialog = el.closest('.InstallModal__dialog')
    if (!dialog) return false

    const closeButton = dialog.querySelector(
      '.Dialog__headerCloseButton'
    ) as HTMLButtonElement
    if (!closeButton) return false

    closeButton.click()

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

      logState(index)

      const buttons = controller.buttons
      const axes = controller.axes
      try {
        if (controller.id.match(/xbox|microsoft|02ea/i)) {
          checkXbox(buttons, axes, index, checkAction)
        } else if (controller.id.match(/gamecube|0337/i)) {
          checkGameCube(buttons, axes, index, checkAction)
        } else if (controller.id.match(/0ce6/i)) {
          checkPS5(buttons, axes, index, checkAction)
        } else if (controller.id.match(/PS3|PLAYSTATION|0268/i)) {
          checkPS3(buttons, axes, index, checkAction)
        } else if (controller.id.match(/2563.*0523/i)) {
          checkPS3Clone1(buttons, axes, index, checkAction)
        } else if (controller.id.match(/0079.*0006/i)) {
          checkN64Clone1(buttons, axes, index, checkAction)
        } else if (controller.id.match(/0583.*a009/i)) {
          checkGenius1(buttons, axes, index, checkAction)
        } else {
          // if not specific, fallback to the xbox layout, seems
          // to be the most common for now and if not exact it seems
          // to cover at least the left stick and the main 2 buttons
          checkXbox(buttons, axes, index, checkAction)
        }
      } catch (error) {
        console.log('Gamepad error:', error)
      }
    })

    requestAnimationFrame(updateStatus)
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
      if (axes[axis] < -0.2 && axes[axis] >= -1)
        console.log(`axis ${axis} activated negative`)
      if (axes[axis] > 0.2 && axes[axis] <= 1)
        console.log(`axis ${axis} activated positive`)
    }
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
    const removedIndex = controllers.findIndex((idx) => idx === gamepad.index)

    // remove disconnected controller
    controllers = controllers.filter((idx) => idx !== gamepad.index)

    // if controller was the current controller, reset and emit
    if (removedIndex === currentController) {
      emitControllerEvent(-1)
    }
  }

  function dispatchControllerEvent(id: string) {
    const controllerEvent = new CustomEvent('controller-changed', {
      detail: {
        controllerId: id
      }
    })

    window.dispatchEvent(controllerEvent)
  }

  function emitControllerEvent(controllerIndex: number) {
    // don't emit a change if it didn't change
    if (currentController === controllerIndex) {
      return
    }

    // if disconnected event
    if (controllerIndex === -1) {
      currentController = controllerIndex
      dispatchControllerEvent('')
      return
    }

    // if not disconnected event, look for id
    const gamepads = navigator.getGamepads()
    const gamepad = gamepads[controllerIndex]
    if (!gamepad) {
      return
    }

    currentController = controllerIndex
    dispatchControllerEvent(gamepad.id)
  }

  window.addEventListener('gamepadconnected', connecthandler)
  window.addEventListener('gamepaddisconnected', disconnecthandler)
}

export const toggleControllerIsDisabled = (value: boolean | undefined) => {
  if (value !== undefined) {
    controllerIsDisabled = value
  } else {
    controllerIsDisabled = !controllerIsDisabled
  }
}
