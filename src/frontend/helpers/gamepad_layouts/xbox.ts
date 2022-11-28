import { ValidGamepadAction } from 'common/types'
// Holds layouts for different XBox official an clone controllers

// Vendor: 045e, Product: 02ea
// Microsoft Controller (STANDARD GAMEPAD Vendor: 045e Product: 02ea)
export function checkXbox(
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
    B = buttons[1],
    X = buttons[2],
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

  // use the `?` operator here since this layout is used as fallback
  // and mapping can be incorrect
  checkAction('mainAction', A?.pressed, controllerIndex)
  checkAction('back', B?.pressed, controllerIndex)
  checkAction('altAction', Y?.pressed, controllerIndex)
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
  checkAction('rightClick', X?.pressed, controllerIndex)
}
