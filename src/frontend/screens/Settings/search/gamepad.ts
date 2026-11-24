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
    id: 'disableGuideButton',
    tab: 'gamepad',
    sectionKey: 'settings.section.controller',
    titleKey: 'setting.disable_guide_button'
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
    id: 'gamepad-binding-altAction',
    tab: 'gamepad',
    sectionKey: 'settings.gamepad.buttonMapping.title',
    titleKey: 'settings.gamepad.button.alt'
  },
  {
    id: 'gamepad-binding-rightClick',
    tab: 'gamepad',
    sectionKey: 'settings.gamepad.buttonMapping.title',
    titleKey: 'settings.gamepad.button.context'
  },
  {
    id: 'gamepad-binding-prevPage',
    tab: 'gamepad',
    sectionKey: 'settings.gamepad.buttonMapping.title',
    titleKey: 'settings.gamepad.button.prevPage'
  },
  {
    id: 'gamepad-binding-nextPage',
    tab: 'gamepad',
    sectionKey: 'settings.gamepad.buttonMapping.title',
    titleKey: 'settings.gamepad.button.nextPage'
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
