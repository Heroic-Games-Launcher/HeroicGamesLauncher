import { addHandler } from 'backend/ipc'
import { getMainWindow } from 'backend/main_window'

// Simulate keyboard and mouse actions as if the real input device is used
addHandler('gamepadAction', (event, args) => {
  // we can only receive gamepad events if the main window exists
  const mainWindow = getMainWindow()!

  const { action, metadata } = args
  const inputEvents: (
    | Electron.MouseInputEvent
    | Electron.MouseWheelInputEvent
    | Electron.KeyboardInputEvent
  )[] = []

  /*
   * How to extend:
   *
   * Valid values for type are 'keyDown', 'keyUp' and 'char'
   * Valid values for keyCode are defined here:
   * https://www.electronjs.org/docs/latest/api/accelerator#available-key-codes
   *
   */
  switch (action) {
    case 'rightStickUp':
      inputEvents.push({
        type: 'mouseWheel',
        deltaY: 50,
        x: mainWindow.getBounds().width / 2,
        y: mainWindow.getBounds().height / 2
      })
      break
    case 'rightStickDown':
      inputEvents.push({
        type: 'mouseWheel',
        deltaY: -50,
        x: mainWindow.getBounds().width / 2,
        y: mainWindow.getBounds().height / 2
      })
      break
    case 'leftStickUp':
    case 'leftStickDown':
    case 'leftStickLeft':
    case 'leftStickRight':
    case 'padUp':
    case 'padDown':
    case 'padLeft':
    case 'padRight':
      // spatial navigation
      inputEvents.push({
        type: 'keyDown',
        keyCode: action.replace(/pad|leftStick/, '')
      })
      inputEvents.push({
        type: 'keyUp',
        keyCode: action.replace(/pad|leftStick/, '')
      })
      break
    case 'leftClick':
      inputEvents.push({
        type: 'mouseDown',
        button: 'left',
        x: metadata.x,
        y: metadata.y
      })
      inputEvents.push({
        type: 'mouseUp',
        button: 'left',
        x: metadata.x,
        y: metadata.y
      })
      break
    case 'rightClick':
      inputEvents.push({
        type: 'mouseDown',
        button: 'right',
        x: metadata.x,
        y: metadata.y
      })
      inputEvents.push({
        type: 'mouseUp',
        button: 'right',
        x: metadata.x,
        y: metadata.y
      })
      break
    case 'back':
      mainWindow.webContents.goBack()
      break
    case 'esc':
      inputEvents.push({
        type: 'keyDown',
        keyCode: 'Esc'
      })
      inputEvents.push({
        type: 'keyUp',
        keyCode: 'Esc'
      })
      break
    case 'tab':
      inputEvents.push(
        {
          type: 'keyDown',
          keyCode: 'Tab'
        },
        {
          type: 'keyUp',
          keyCode: 'Tab'
        }
      )
      break
    case 'shiftTab':
      inputEvents.push(
        {
          type: 'keyDown',
          keyCode: 'Tab',
          modifiers: ['shift']
        },
        {
          type: 'keyUp',
          keyCode: 'Tab',
          modifiers: ['shift']
        }
      )
      break
  }

  if (inputEvents.length) {
    inputEvents.forEach((event) => mainWindow.webContents.sendInputEvent(event))
  }
})
