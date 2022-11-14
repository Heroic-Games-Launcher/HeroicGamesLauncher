// Holds layouts for different Genius controllers

import { ValidGamepadAction } from 'common/types'

// Vendor: 0583, Product: a009
// Genius MaxFire G-12U Vibration (in default mode)
export function checkGenius1(
  buttons: readonly GamepadButton[],
  axes: readonly number[],
  controllerIndex: number,
  checkAction: (
    action: ValidGamepadAction,
    pressed: boolean,
    ctrlIdx: number
  ) => void
) {
  const one = buttons[0],
    two = buttons[1],
    three = buttons[2],
    four = buttons[3],
    // L1 = buttons[4],
    // R1 = buttons[5],
    // L2 = buttons[6],
    // R2 = buttons[7],
    // select = buttons[8],
    // start = buttons[9],
    // L3 = buttons[10], // press left stick
    // R3 = buttons[11], // press right stick
    leftAxisX = axes[0],
    leftAxisY = axes[1],
    rightAxisX = axes[2],
    rightAxisY = axes[3],
    dPadX = axes[4],
    dPadY = axes[5]

  checkAction('padUp', dPadY === -1, controllerIndex)
  checkAction('padDown', dPadY === 1, controllerIndex)
  checkAction('padLeft', dPadX === -1, controllerIndex)
  checkAction('padRight', dPadX === 1, controllerIndex)
  checkAction('leftStickLeft', leftAxisX < -0.5, controllerIndex)
  checkAction('leftStickRight', leftAxisX > 0.5, controllerIndex)
  checkAction('leftStickUp', leftAxisY < -0.5, controllerIndex)
  checkAction('leftStickDown', leftAxisY > 0.5, controllerIndex)
  checkAction('rightStickLeft', rightAxisX < -0.5, controllerIndex)
  checkAction('rightStickRight', rightAxisX > 0.5, controllerIndex)
  checkAction('rightStickUp', rightAxisY < -0.5, controllerIndex)
  checkAction('rightStickDown', rightAxisY > 0.5, controllerIndex)
  checkAction('mainAction', one.pressed, controllerIndex)
  checkAction('back', two.pressed, controllerIndex)
  checkAction('altAction', four.pressed, controllerIndex)
  checkAction('rightClick', three.pressed, controllerIndex)
}
