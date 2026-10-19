import { execFile } from 'child_process'
import { promisify } from 'util'
import i18next from 'i18next'

const execFileAsync = promisify(execFile)

let installed: boolean | undefined

export async function rosettaIsInstalled(): Promise<boolean> {
  if (installed) return true
  try {
    await execFileAsync('/usr/bin/arch', ['-x86_64', '/usr/bin/true'], {
      timeout: 20000
    })
    installed = true
    return true
  } catch {
    return false
  }
}

/**
 * Asks to install Rosetta, then runs `softwareupdate`. macOS asks for the
 * password itself. Returns whether Rosetta works afterwards.
 */
export async function ensureRosetta(): Promise<boolean> {
  if (process.platform !== 'darwin' || process.arch === 'x64') return true
  if (await rosettaIsInstalled()) return true

  const { dialog } = await import('electron')
  const { response } = await dialog.showMessageBox({
    type: 'warning',
    buttons: [
      i18next.t('box.warning.rosetta.install', 'Install Rosetta'),
      i18next.t('box.warning.rosetta.later', 'Not Now')
    ],
    defaultId: 0,
    cancelId: 1,
    title: i18next.t('box.warning.rosetta.title', 'Rosetta is not installed'),
    message: i18next.t(
      'box.warning.rosetta.message',
      'Intel games and Wine need Rosetta on this Mac. Heroic can install it now. macOS will ask for your password.'
    )
  })
  if (response !== 0) return false

  await execFileAsync(
    '/usr/sbin/softwareupdate',
    ['--install-rosetta', '--agree-to-license'],
    { timeout: 300000 }
  ).catch(() => undefined)

  installed = undefined
  return rosettaIsInstalled()
}

export function isRosettaMissingError(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code
  const codeText =
    typeof code === 'string' || typeof code === 'number' ? `${code}` : ''
  const message = error instanceof Error ? error.message : ''
  const text = `${codeText} ${message}`
  return (
    text.includes('-86') ||
    text.includes('Bad CPU type') ||
    text.includes('EBADARCH')
  )
}

export const ROSETTA_LAUNCH_PREFIX = ['/usr/bin/arch', '-x86_64']
