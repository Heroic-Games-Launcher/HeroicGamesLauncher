import type { SettingsSearchEntry } from './types'

export const generalSearchEntries: SettingsSearchEntry[] = [
  {
    id: 'theme_selector',
    tab: 'general',
    sectionKey: 'settings.section.appearance',
    titleKey: 'setting.select_theme'
  },
  {
    id: 'custom_themes_path',
    tab: 'general',
    sectionKey: 'settings.section.appearance',
    titleKey: 'setting.custom_themes_path'
  },
  {
    id: 'framelessWindow',
    tab: 'general',
    sectionKey: 'settings.section.appearance',
    titleKey: 'setting.frameless-window.description'
  },
  {
    id: 'library_top_section_selector',
    tab: 'general',
    sectionKey: 'settings.section.appearance',
    titleKey: 'setting.library_top_section'
  },
  {
    id: 'setMaxRecentGames',
    tab: 'general',
    sectionKey: 'settings.section.appearance',
    titleKey: 'setting.maxRecentGames'
  },
  {
    id: 'languageSelector',
    tab: 'general',
    sectionKey: 'settings.section.language',
    titleKey: 'setting.language'
  },
  {
    id: 'default_install_path',
    tab: 'general',
    sectionKey: 'settings.section.locations',
    titleKey: 'setting.default-install-path'
  },
  {
    id: 'selectDefaultWinePrefix',
    tab: 'general',
    sectionKey: 'settings.section.locations',
    titleKey: 'setting.defaultWinePrefix'
  },
  {
    id: 'autoUpdateGames',
    tab: 'general',
    sectionKey: 'settings.section.downloads',
    titleKey: 'setting.autoUpdateGames'
  },
  {
    id: 'checkForUpdatesOnStartup',
    tab: 'general',
    sectionKey: 'settings.section.downloads',
    titleKey: 'setting.checkForUpdatesOnStartup'
  },
  {
    id: 'max_workers',
    tab: 'general',
    sectionKey: 'settings.section.downloads',
    titleKey: 'setting.maxworkers'
  },
  {
    id: 'minimizeOnLaunch',
    tab: 'general',
    sectionKey: 'settings.section.gameplay',
    titleKey: 'setting.minimize-on-launch'
  },
  {
    id: 'disablePlaytimeSync',
    tab: 'general',
    sectionKey: 'settings.section.gameplay',
    titleKey: 'setting.disablePlaytimeSync'
  },
  {
    id: 'shortcutsToDesktop',
    tab: 'general',
    sectionKey: 'settings.section.gameplay',
    titleKey: 'setting.adddesktopshortcuts',
    platforms: ['linux', 'win32']
  },
  {
    id: 'shortcutsToMenu',
    tab: 'general',
    sectionKey: 'settings.section.gameplay',
    titleKey: 'setting.addgamestostartmenu',
    platforms: ['linux', 'win32']
  },
  {
    id: 'shortcutsToMenu',
    tab: 'general',
    sectionKey: 'settings.section.gameplay',
    titleKey: 'setting.addgamestoapplications',
    platforms: ['darwin']
  },
  {
    id: 'shortcutsToSteam',
    tab: 'general',
    sectionKey: 'settings.section.gameplay',
    titleKey: 'setting.addgamestosteam'
  },
  {
    id: 'noTrayIcon',
    tab: 'general',
    sectionKey: 'settings.section.system',
    titleKey: 'setting.no-tray-icon'
  },
  {
    id: 'exitToTray',
    tab: 'general',
    sectionKey: 'settings.section.system',
    titleKey: 'setting.exit-to-tray'
  },
  {
    id: 'startInTray',
    tab: 'general',
    sectionKey: 'settings.section.system',
    titleKey: 'setting.start-in-tray'
  },
  {
    id: 'changeTrayColor',
    tab: 'general',
    sectionKey: 'settings.section.system',
    titleKey: 'setting.darktray'
  },
  {
    id: 'startInConsoleMode',
    tab: 'general',
    sectionKey: 'settings.section.system',
    titleKey: 'setting.start-in-console-mode'
  },
  {
    id: 'hideChangelogsOnStartup',
    tab: 'general',
    sectionKey: 'settings.section.system',
    titleKey: 'setting.hideChangelogsOnStartup'
  },
  {
    id: 'discordRPC',
    tab: 'general',
    sectionKey: 'settings.section.privacy',
    titleKey: 'setting.discordRPC'
  },
  {
    id: 'analyticsOptIn',
    tab: 'general',
    sectionKey: 'settings.section.privacy',
    titleKey: 'setting.analyticsOptIn'
  }
]
