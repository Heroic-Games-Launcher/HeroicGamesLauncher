// Holds layouts for different Nintendo official and clone controllers

import { ValidGamepadAction } from 'common/types'

export function checkGameCube(
  buttons: readonly GamepadButton[],
  axes: readonly number[],
  controllerIndex: number,
  checkAction: (
    action: ValidGamepadAction,
    pressed: boolean,
    ctrlIdx: number
  ) => void
) {
  const A = buttons[0],
    X = buttons[1],
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
  checkAction('rightClick', X.pressed, controllerIndex)
}

// Nintendo Switch Pro Controller / Joy-Cons (Vendor: 057e)
// Chromium reports these with the "standard" mapping by physical position,
// so buttons[0] is the bottom button (labeled B on Switch) and buttons[1] is
// the right button (labeled A). We swap the face buttons so the A/B and X/Y
// actions match the Nintendo labels shown in the UI.
export function checkSwitchPro(
  buttons: readonly GamepadButton[],
  axes: readonly number[],
  controllerIndex: number,
  checkAction: (
    action: ValidGamepadAction,
    pressed: boolean,
    ctrlIdx: number
  ) => void
) {
  const B = buttons[0], // bottom button
    A = buttons[1], // right button
    Y = buttons[2], // left button
    X = buttons[3], // top button
    up = buttons[12],
    down = buttons[13],
    left = buttons[14],
    right = buttons[15],
    guideButton = buttons[16],
    leftAxisX = axes[0],
    leftAxisY = axes[1],
    rightAxisX = axes[2],
    rightAxisY = axes[3]

  checkAction('mainAction', A?.pressed, controllerIndex)
  checkAction('back', B?.pressed, controllerIndex)
  checkAction('altAction', Y?.pressed, controllerIndex)
  checkAction('rightClick', X?.pressed, controllerIndex)
  checkAction('leftStickLeft', leftAxisX < -0.5, controllerIndex)
  checkAction('leftStickRight', leftAxisX > 0.5, controllerIndex)
  checkAction('leftStickUp', leftAxisY < -0.5, controllerIndex)
  checkAction('leftStickDown', leftAxisY > 0.5, controllerIndex)
  checkAction('rightStickLeft', rightAxisX < -0.5, controllerIndex)
  checkAction('rightStickRight', rightAxisX > 0.5, controllerIndex)
  checkAction('rightStickUp', rightAxisY < -0.5, controllerIndex)
  checkAction('rightStickDown', rightAxisY > 0.5, controllerIndex)
  checkAction('padUp', up?.pressed, controllerIndex)
  checkAction('padDown', down?.pressed, controllerIndex)
  checkAction('padLeft', left?.pressed, controllerIndex)
  checkAction('padRight', right?.pressed, controllerIndex)
  checkAction('guide', guideButton?.pressed, controllerIndex)
}

// Generic USB Joystick (Vendor: 0079 Product: 0006)
export function checkN64Clone1(
  buttons: readonly GamepadButton[],
  axes: readonly number[],
  controllerIndex: number,
  checkAction: (
    action: ValidGamepadAction,
    pressed: boolean,
    ctrlIdx: number
  ) => void
) {
  const // CUp = buttons[0],
    // CRight = buttons[1],
    CDown = buttons[2],
    // CUp = buttons[3],
    // L = buttons[4],
    // R = buttons[5],
    A = buttons[6],
    Z = buttons[7],
    B = buttons[8],
    // Start = buttons[9],
    axisX = axes[0],
    axisY = axes[1],
    dPadAxis = axes[9]

  // dPad values are mapped to AXIS 9 as:
  // up: -1
  // up-right: -0.71429
  // right: -0.42857
  // down-right: -0.14286
  // down: 0.14286
  // down-left: 0.42857
  // left: 0.71429
  // up-left: 1

  // we multiply by 10 and round to digit we want
  // -1 -> -10
  // -0.71429 -> -7
  // -0.42857 -> -4
  // etc ...
  const dPadVal = Math.round(dPadAxis * 10)

  checkAction('padUp', dPadVal === -10, controllerIndex)
  checkAction('padDown', dPadVal === -1, controllerIndex)
  checkAction('padLeft', dPadVal === 7, controllerIndex)
  checkAction('padRight', dPadVal === 4, controllerIndex)
  checkAction('leftStickLeft', axisX < -0.5, controllerIndex)
  checkAction('leftStickRight', axisX > 0.5, controllerIndex)
  checkAction('leftStickUp', axisY < -0.5, controllerIndex)
  checkAction('leftStickDown', axisY > 0.5, controllerIndex)
  checkAction('mainAction', A.pressed, controllerIndex)
  checkAction('back', B.pressed, controllerIndex)
  checkAction('altAction', CDown.pressed, controllerIndex)
  checkAction('rightClick', Z.pressed, controllerIndex)
}
