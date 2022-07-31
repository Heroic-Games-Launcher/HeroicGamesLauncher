/**
 * Types for steam-shortcut-editor javascript package
 * https://github.com/tirish/steam-shortcut-editor
 */
declare module 'steam-shortcut-editor' {
  export function parseBuffer(
    buffer: Buffer,
    opts?: Options
  ): Partial<ShortcutObject>
  export function writeBuffer(object: Partial<ShortcutObject>): Buffer

  interface Options {
    autoConvertBooleans: boolean
    autoConvertArrays: boolean
    dateProperties: string[]
  }

  interface ShortcutObject {
    shortcuts: ShortcutEntry[]
  }

  // available entries can be found here:
  // https://github.com/CorporalQuesadilla/Steam-Shortcut-Manager/wiki/Steam-Shortcuts-Documentation#shortcut-entry-structure
  interface ShortcutEntry {
    appid: number
    AppName: string
    Exe: string
    StartDir: string
    icon: string
    ShortcutPath: string
    LaunchOptions: string
    IsHidden: boolean
    AllowDesktopConfig: boolean
    AllowOverlay: boolean
    OpenVR: boolean
    Devkit: boolean
    DevkitGameID: string
    DevkitOverrideAppID: boolean
    LastPlayTime: Date
    FlatpakAppID: string
    tags: string[]
  }
}
