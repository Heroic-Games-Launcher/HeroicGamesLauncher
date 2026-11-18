import type { SettingsSearchEntry } from './types'

export const gamepadSearchEntries: SettingsSearchEntry[] = [
  {
    id: 'disableController',
    tab: 'gamepad',
    sectionKey: 'settings.section.controller',
    titleKey: 'setting.disable_controller'
  },
  {
    id: 'gamepadDeadzone',
    tab: 'gamepad',
    sectionKey: 'settings.section.controller',
    titleKey: 'setting.gamepad-deadzone'
  },
  {
    id: 'gamePadDelayRepeat',
    tab: 'gamepad',
    sectionKey: 'settings.section.controller',
    titleKey: 'setting.gamepad-initial-repeat-delay'
  },
  {
    id: 'gamePadRepeatRate',
    tab: 'gamepad',
    sectionKey: 'settings.section.controller',
    titleKey: 'setting.gamepad-repeat-frequency'
  },
  {
    id: 'gamepad-binding-mainAction',
    tab: 'gamepad',
    sectionKey: 'settings.gamepad.buttonMapping.title',
    titleKey: 'settings.gamepad.button.main'
  },
  {
    id: 'gamepad-binding-back',
    tab: 'gamepad',
    sectionKey: 'settings.gamepad.buttonMapping.title',
    titleKey: 'settings.gamepad.button.back'
  },
  {
    id: 'gamepad-binding-enter',
    tab: 'gamepad',
    sectionKey: 'settings.gamepad.buttonMapping.title',
    titleKey: 'settings.gamepad.button.enter'
  },
  {
    id: 'gamepad-binding-guide',
    tab: 'gamepad',
    sectionKey: 'settings.gamepad.buttonMapping.title',
    titleKey: 'settings.gamepad.button.guide'
  }
]
