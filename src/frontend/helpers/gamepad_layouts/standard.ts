import { RemappableGamepadAction, ValidGamepadAction } from 'common/types'
// Holds layouts for different XBox official an clone controllers

type ButtonOverrides = Partial<Record<RemappableGamepadAction, number | null>>

export function checkStandard(
  buttons: readonly GamepadButton[],
  axes: readonly number[],
  controllerIndex: number,
  checkAction: (
    action: ValidGamepadAction,
    pressed: boolean,
    ctrlIdx: number
  ) => void,
  overrides: ButtonOverrides = {}
) {
  const mainButton = buttons[0], // Xbox: A, PS: Cross
    backButton = buttons[1], // Xbox: B, PS: Circle
    contextMenuButton = buttons[2], // Xbox: X, PS: Square
    altButton = buttons[3], // Xbox: Y, PS: Triangle
    leftBumper = buttons[4], // Xbox: LB, PS: L1
    rightBumper = buttons[5], // Xbox: RB, PS: R1
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
    guideButton = buttons[16], // Xbox "Guide" / PS button
    leftAxisX = axes[0],
    leftAxisY = axes[1],
    rightAxisX = axes[2],
    rightAxisY = axes[3]

  // use the `?` operator here since this layout is used as fallback
  // and mapping can be incorrect
  // user remapping: `null` unbinds the action, `undefined` keeps the default
  const button = (
    action: RemappableGamepadAction,
    fallback: GamepadButton | undefined
  ) => {
    const override = overrides[action]
    if (override === null) return undefined
    return override === undefined ? fallback : buttons[override]
  }

  checkAction(
    'mainAction',
    button('mainAction', mainButton)?.pressed ?? false,
    controllerIndex
  )
  checkAction(
    'back',
    button('back', backButton)?.pressed ?? false,
    controllerIndex
  )
  checkAction(
    'altAction',
    button('altAction', altButton)?.pressed ?? false,
    controllerIndex
  )
  checkAction(
    'prevPage',
    button('prevPage', leftBumper)?.pressed ?? false,
    controllerIndex
  )
  checkAction(
    'nextPage',
    button('nextPage', rightBumper)?.pressed ?? false,
    controllerIndex
  )
  checkAction('leftStickLeft', leftAxisX < -0.5, controllerIndex)
  checkAction('leftStickRight', leftAxisX > 0.5, controllerIndex)
  checkAction('leftStickUp', leftAxisY < -0.5, controllerIndex)
  checkAction('leftStickDown', leftAxisY > 0.5, controllerIndex)
  checkAction('rightStickLeft', rightAxisX < -0.5, controllerIndex)
  checkAction('rightStickRight', rightAxisX > 0.5, controllerIndex)
  checkAction('rightStickUp', rightAxisY < -0.5, controllerIndex)
  checkAction('rightStickDown', rightAxisY > 0.5, controllerIndex)
  checkAction('padUp', up?.pressed ?? false, controllerIndex)
  checkAction('padDown', down?.pressed ?? false, controllerIndex)
  checkAction('padLeft', left?.pressed ?? false, controllerIndex)
  checkAction('padRight', right?.pressed ?? false, controllerIndex)
  checkAction(
    'rightClick',
    button('rightClick', contextMenuButton)?.pressed ?? false,
    controllerIndex
  )
  checkAction(
    'enter',
    button('enter', buttons[10])?.pressed ?? false,
    controllerIndex
  ) // L3
  checkAction(
    'guide',
    button('guide', guideButton)?.pressed ?? false,
    controllerIndex
  )
}
