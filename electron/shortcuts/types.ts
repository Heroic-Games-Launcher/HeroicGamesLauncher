interface ShortcutInfo {
  is_added_steam: boolean
  is_added_desktop: boolean
}

interface ShortcutsResult {
  success: boolean
  errors: string[]
}

export { ShortcutInfo, ShortcutsResult }
