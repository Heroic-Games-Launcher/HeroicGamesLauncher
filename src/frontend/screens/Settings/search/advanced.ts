import type { SettingsSearchEntry } from './types'

export const advancedSearchEntries: SettingsSearchEntry[] = [
  {
    id: 'steamgriddb-api-key',
    tab: 'advanced',
    sectionKey: 'settings.section.integrations',
    titleKey: 'settings.steamgriddb.apikey.title'
  },
  {
    id: 'downloadNoHttps',
    tab: 'advanced',
    sectionKey: 'settings.section.behaviour',
    titleKey: 'setting.download-no-https'
  },
  {
    id: 'disableLogs',
    tab: 'advanced',
    sectionKey: 'settings.section.behaviour',
    titleKey: 'setting.disable_logs'
  },
  {
    id: 'disableDiscounts',
    tab: 'advanced',
    sectionKey: 'settings.section.behaviour',
    titleKey: 'setting.disableDiscounts'
  },
  {
    id: 'disableGOGAffiliate',
    tab: 'advanced',
    sectionKey: 'settings.section.behaviour',
    titleKey: 'setting.disableGOGAffiliate'
  },
  {
    id: 'disableAnticheatCheck',
    tab: 'advanced',
    sectionKey: 'settings.section.behaviour',
    titleKey: 'setting.allow_installation_broken_anticheat.label'
  },
  {
    id: 'hideWindowOnProtocolLaunch',
    tab: 'advanced',
    sectionKey: 'settings.section.behaviour',
    titleKey: 'setting.hide-window-on-protocol-launch'
  },
  {
    id: 'gamePadDelayRepeat',
    tab: 'advanced',
    sectionKey: 'settings.section.controller',
    titleKey: 'setting.gamepad-initial-repeat-delay'
  },
  {
    id: 'gamePadRepeatRate',
    tab: 'advanced',
    sectionKey: 'settings.section.controller',
    titleKey: 'setting.gamepad-repeat-frequency'
  },
  {
    id: 'enableHelp',
    tab: 'advanced',
    sectionKey: 'settings.section.experimental',
    titleKey: 'setting.experimental_features.enableHelp'
  },
  {
    id: 'cometSupport',
    tab: 'advanced',
    sectionKey: 'settings.section.experimental',
    titleKey: 'setting.experimental_features.cometSupport'
  },
  {
    id: 'zoomPlatform',
    tab: 'advanced',
    sectionKey: 'settings.section.experimental',
    titleKey: 'setting.experimental_features.zoomPlatform'
  },
  {
    titleKey: 'settings.section.eosOverlay',
    tab: 'advanced',
    sectionKey: 'settings.section.eosOverlay'
  },
  {
    id: 'customCSSArea',
    tab: 'advanced',
    sectionKey: 'settings.section.maintenance',
    titleKey: 'settings.custom_css.title'
  },
  {
    tab: 'advanced',
    sectionKey: 'settings.section.maintenance',
    titleKey: 'settings.advanced.title.clearCache'
  },
  {
    tab: 'advanced',
    sectionKey: 'settings.section.maintenance',
    titleKey: 'settings.advanced.title.clearImagesCache'
  },
  {
    tab: 'advanced',
    sectionKey: 'settings.section.maintenance',
    titleKey: 'settings.advanced.title.resetHeroic'
  }
]
