import type { MenuItemConstructorOptions } from 'electron'

// Electron labels About, Hide and Quit with app.name, which is package.json's
// lowercase "heroic". Renaming the app is not an option: macOS ties the
// keychain entry behind safeStorage, and saved cookies, to that name.
export function macAppMenuTemplate(): MenuItemConstructorOptions[] {
  const name = 'Heroic'
  return [
    {
      label: name,
      submenu: [
        { role: 'about', label: `About ${name}` },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: `Hide ${name}` },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: `Quit ${name}` }
      ]
    },
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ]
}
