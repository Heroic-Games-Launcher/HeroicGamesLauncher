export type ControllerLayout = 'ps' | 'xbox' | 'nintendo' | 'steam-deck'

export function detectControllerLayout(id: string): ControllerLayout {
  if (/sony|054c|PS3|PLAYSTATION|0268|2563.*0523/i.test(id)) return 'ps'
  if (/28de.*11ff/.test(id)) return 'steam-deck'
  if (/microsoft|xbox/i.test(id)) return 'xbox'
  if (/nintendo|057e|switch|joy.?con|pro.?controller/i.test(id))
    return 'nintendo'
  return 'xbox'
}

export const BACK_BUTTON_LABELS: Record<ControllerLayout, string> = {
  ps: '◯',
  xbox: 'B',
  nintendo: 'B',
  'steam-deck': 'B'
}
