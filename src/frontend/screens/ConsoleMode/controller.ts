export type ControllerLayout =
  | 'ps4'
  | 'ps5'
  | 'xbox'
  | 'nintendo'
  | 'steam-deck'

// Standard gamepad button indices (Chromium "standard" mapping).
const BTN_ACTION = 0
const BTN_BACK = 1
export const BTN_L1 = 4
export const BTN_R1 = 5
export const BTN_R2 = 7

export const getActionButtonLabel = (layout: ControllerLayout) =>
  layout.startsWith('ps') ? '✕' : 'A'

// Nintendo controllers report the same Chromium "standard" positions as Xbox,
// but their A/B labels sit in swapped physical positions, so confirm/cancel
// must swap to match the on-screen glyphs.
export const getActionButtonIndex = (layout: ControllerLayout) =>
  layout === 'nintendo' ? BTN_BACK : BTN_ACTION
export const getBackButtonIndex = (layout: ControllerLayout) =>
  layout === 'nintendo' ? BTN_ACTION : BTN_BACK

export function detectControllerLayout(id: string): ControllerLayout {
  if (/054c|PS3|054c.*09cc|0268|'2563.*0523/i.test(id)) return 'ps4'
  if (/054c.*0ce6/i.test(id)) return 'ps5'
  if (/28de.*11ff/.test(id)) return 'steam-deck'
  if (/microsoft|xbox/i.test(id)) return 'xbox'
  if (/nintendo|057e|switch|joy.?con|pro.?controller/i.test(id))
    return 'nintendo'
  return 'xbox'
}

export const getBackButtonLabel = (layout: ControllerLayout) =>
  layout.startsWith('ps') ? '◯' : 'B'
