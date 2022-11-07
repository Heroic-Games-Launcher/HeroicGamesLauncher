// Holds layouts for different Playstation official an clone controllers

import { ValidGamepadAction } from 'common/types'

export function checkPS3(
  buttons: readonly GamepadButton[],
  axes: readonly number[],
  controllerIndex: number,
  checkAction: (
    action: ValidGamepadAction,
    pressed: boolean,
    ctrlIdx: number
  ) => void
) {
  const X = buttons[0],
    Circle = buttons[1],
    Square = buttons[2],
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
  checkAction('rightClick', Square.pressed, controllerIndex)
}

export function checkPS5(
  buttons: readonly GamepadButton[],
  axes: readonly number[],
  controllerIndex: number,
  checkAction: (
    action: ValidGamepadAction,
    pressed: boolean,
    ctrlIdx: number
  ) => void
) {
  const X = buttons[0],
    Circle = buttons[1],
    Square = buttons[2],
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
    leftAxisX = axes[0],
    leftAxisY = axes[1],
    rightAxisX = axes[2],
    rightAxisY = axes[3]

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
  checkAction('rightClick', Square.pressed, controllerIndex)
}

// Vendor: 2563, Product: 0523
export function checkPS3Clone1(
  buttons: readonly GamepadButton[],
  axes: readonly number[],
  controllerIndex: number,
  checkAction: (
    action: ValidGamepadAction,
    pressed: boolean,
    ctrlIdx: number
  ) => void
) {
  const Triangle = buttons[0],
    Circle = buttons[1],
    X = buttons[2],
    Square = buttons[3],
    // LB = buttons[4],
    // RB = buttons[5],
    // LT = buttons[6],
    // RT = buttons[7],
    // Select = buttons[8],
    // Start = buttons[9],
    dPadX = axes[4],
    dPadY = axes[5],
    leftAxisX = axes[0],
    leftAxisY = axes[1],
    rightAxisX = axes[2],
    rightAxisY = axes[3]

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
  checkAction('mainAction', X.pressed, controllerIndex)
  checkAction('back', Circle.pressed, controllerIndex)
  checkAction('altAction', Triangle.pressed, controllerIndex)
  checkAction('rightClick', Square.pressed, controllerIndex)
}
