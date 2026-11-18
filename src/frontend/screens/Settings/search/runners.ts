import type { SettingsSearchEntry } from './types'

export const runnersSearchEntries: SettingsSearchEntry[] = [
  {
    id: 'setting-alt-legendary',
    tab: 'runners',
    sectionKey: 'settings.section.epic',
    titleKey: 'setting.alt-legendary-bin'
  },
  {
    id: 'syncToggle',
    tab: 'runners',
    sectionKey: 'settings.section.epic',
    titleKey: 'setting.egs-sync',
    platforms: ['win32']
  },
  {
    id: 'set_epic_sync_path',
    tab: 'runners',
    sectionKey: 'settings.section.epic',
    titleKey: 'setting.egs-sync',
    platforms: ['linux', 'darwin']
  },
  {
    id: 'setting-alt-gogdl',
    tab: 'runners',
    sectionKey: 'settings.section.gog',
    titleKey: 'setting.alt-gogdl-bin'
  },
  {
    id: 'disableGOGPresence',
    tab: 'runners',
    sectionKey: 'settings.section.gog',
    titleKey: 'setting.disable_gog_presence'
  },
  {
    id: 'setting-alt-nile',
    tab: 'runners',
    sectionKey: 'settings.section.amazon',
    titleKey: 'setting.alt-nile-bin'
  },
  {
    id: 'setting-alt-aurelia',
    tab: 'runners',
    sectionKey: 'settings.section.steam',
    titleKey: 'setting.alt-aurelia-bin'
  },
  {
    id: 'default_steam_path',
    tab: 'runners',
    sectionKey: 'settings.section.steam',
    titleKey: 'setting.default-steam-path'
  },
  {
    id: 'showValveProton',
    tab: 'runners',
    sectionKey: 'settings.section.steam',
    titleKey: 'setting.show_valve_proton.label',
    platforms: ['linux']
  }
]
