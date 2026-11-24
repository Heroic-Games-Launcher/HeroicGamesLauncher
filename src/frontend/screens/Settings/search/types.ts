export type SettingsSearchTab = 'general' | 'runners' | 'advanced'

export interface SettingsSearchEntry {
  /** The control's htmlId, used to scroll to and focus it. */
  id?: string
  tab: SettingsSearchTab
  /** SettingsCard title key, shown as the result context. */
  sectionKey: string
  /** Setting title key. Only this text is searched. */
  titleKey: string
  /** Hide entries that do not exist on the current platform. */
  platforms?: NodeJS.Platform[]
}

export interface ResolvedSettingsSearchEntry extends SettingsSearchEntry {
  title: string
  section: string
}
