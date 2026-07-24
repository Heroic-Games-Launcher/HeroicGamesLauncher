export interface DesktopEntry {
  Name: string
  Exec: string
  Icon?: string
  StartupWMClass?: string
  Path?: string
}

export interface ParsedProtonShorctut {
  name: string
  executable: string
  icon?: string
}
