import { app } from 'electron'
import { execFile } from 'child_process'
import { unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { promisify } from 'util'

const run = promisify(execFile)

const SCRIPT_NAME = 'heroicActivateWindow'

async function qdbus(args: string[]): Promise<string> {
  // Plasma 6 ships qdbus6, Plasma 5 qdbus
  for (const bin of ['qdbus6', 'qdbus']) {
    try {
      const { stdout } = await run(bin, args)
      return stdout.trim()
    } catch {
      continue
    }
  }
  throw new Error('qdbus not available')
}

// KWin denies focus stealing on Wayland
export async function kwinActivateWindow(caption: string): Promise<void> {
  if (process.platform !== 'linux') return

  // Supports both KWin 5 and 6
  const script = `
    const list =
      typeof workspace.windowList === 'function'
        ? workspace.windowList()
        : workspace.clientList()
    for (const w of list) {
      if (w.caption === ${JSON.stringify(caption)}) {
        if ('activeWindow' in workspace) workspace.activeWindow = w
        else workspace.activeClient = w
      }
    }
  `
  const file = join(
    app.getPath('temp'),
    `heroic-kwin-activate-${Date.now()}.js`
  )
  await writeFile(file, script)
  try {
    await qdbus([
      'org.kde.KWin',
      '/Scripting',
      'org.kde.kwin.Scripting.unloadScript',
      SCRIPT_NAME
    ]).catch(() => '')
    const id = await qdbus([
      'org.kde.KWin',
      '/Scripting',
      'org.kde.kwin.Scripting.loadScript',
      file,
      SCRIPT_NAME
    ])
    await qdbus([
      'org.kde.KWin',
      `/Scripting/Script${id}`,
      'org.kde.kwin.Script.run'
    ])
    await qdbus([
      'org.kde.KWin',
      '/Scripting',
      'org.kde.kwin.Scripting.unloadScript',
      SCRIPT_NAME
    ]).catch(() => '')
  } finally {
    await unlink(file).catch(() => {})
  }
}
