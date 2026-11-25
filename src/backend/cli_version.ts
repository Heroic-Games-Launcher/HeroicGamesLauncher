import { app } from 'electron'

// Imported first in main.ts, so this exits before anything creates config files or opens a window
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  console.log(`Heroic Games Launcher ${app.getVersion()}`)
  process.exit(0)
}
