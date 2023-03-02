import { getMainWindow } from './../../main_window'
import { isMac, isWindows } from 'backend/constants'
import { getGogdlVersion } from 'backend/gog/utils'
import { getLegendaryVersion } from 'backend/legendary/utils'
import { getHeroicVersion, getFileSize, openUrlOrFile, execAsync } from '..'
import { dialog } from 'electron'
import { t } from 'i18next'
import { spawn } from 'child_process'
import { logError, logInfo, LogPrefix } from 'backend/logger/logger'
import si from 'systeminformation'

// This won't change while the app is running
// Caching significantly increases performance when launching games
let systemInfoCache = ''
const getSystemInfo = async () => {
  if (systemInfoCache !== '') {
    return systemInfoCache
  }
  const heroicVersion = getHeroicVersion()
  const legendaryVersion = await getLegendaryVersion()
  const gogdlVersion = await getGogdlVersion()

  const electronVersion = process.versions.electron || 'unknown'
  const chromeVersion = process.versions.chrome || 'unknown'
  const nodeVersion = process.versions.node || 'unknown'

  // get CPU and RAM info
  const { manufacturer, brand, speed, governor } = await si.cpu()
  const { total, available } = await si.mem()

  // get OS information
  const { distro, kernel, arch, platform, release, codename } =
    await si.osInfo()

  // get GPU information
  const { controllers } = await si.graphics()
  const graphicsCards = String(
    controllers.map(
      ({ name, model, vram, driverVersion }, i) =>
        `GPU${i}: ${name ? name : model} ${vram ? `VRAM: ${vram}MB` : ''} ${
          driverVersion ? `DRIVER: ${driverVersion}` : ''
        } \n`
    )
  )
    .replaceAll(',', '')
    .replaceAll('\n', '')

  const isLinux = platform === 'linux'
  const xEnv = isLinux
    ? (await execAsync('echo $XDG_SESSION_TYPE')).stdout.replaceAll('\n', '')
    : ''

  systemInfoCache = `Heroic Version: ${heroicVersion}
Legendary Version: ${legendaryVersion}
GOGdl Version: ${gogdlVersion}

Electron Version: ${electronVersion}
Chrome Version: ${chromeVersion}
NodeJS Version: ${nodeVersion}

OS: ${isMac ? `${codename} ${release}` : distro} KERNEL: ${kernel} ARCH: ${arch}
CPU: ${manufacturer} ${brand} @${speed} ${
    governor ? `GOVERNOR: ${governor}` : ''
  }
RAM: Total: ${getFileSize(total)} Available: ${getFileSize(available)}
GRAPHICS: ${graphicsCards}
${isLinux ? `PROTOCOL: ${xEnv}` : ''}`
  return systemInfoCache
}

/**
 * Detects MS Visual C++ Redistributable and prompts for its installation if it's not found
 * Many games require this while not actually specifying it, so it's good to have
 *
 * Only works on Windows of course
 */
function detectVCRedist() {
  if (!isWindows) {
    return
  }

  // According to this article avoid using wmic and Win32_Product
  // https://xkln.net/blog/please-stop-using-win32product-to-find-installed-software-alternatives-inside/
  // wmic is also deprecated
  const detectedVCRInstallations: string[] = []
  let stderr = ''

  // get applications
  const child = spawn('powershell.exe', [
    'Get-ItemProperty',
    'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*,',
    'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
    '|',
    'Select-Object',
    'DisplayName',
    '|',
    'Format-Table',
    '-AutoSize'
  ])

  child.stdout.setEncoding('utf-8')
  child.stdout.on('data', (data: string) => {
    const splitData = data.split('\n')
    for (const installation of splitData) {
      if (installation && installation.includes('Microsoft Visual C++ 2022')) {
        detectedVCRInstallations.push(installation)
      }
    }
  })

  child.stderr.setEncoding('utf-8')
  child.stderr.on('data', (data: string) => {
    stderr += data
  })

  child.on('error', (error: Error) => {
    logError(['Check of VCRuntime crashed with:', error], LogPrefix.Backend)
    return
  })

  child.on('close', async (code: number) => {
    if (code) {
      logError(
        `Failed to check for VCRuntime installations\n${stderr}`,
        LogPrefix.Backend
      )
      return
    }
    // VCR installers install both the "Minimal" and "Additional" runtime, and we have 2 installers (x86 and x64) -> 4 installations in total
    const mainWindow = getMainWindow()
    if (detectedVCRInstallations.length < 4 && mainWindow) {
      const { response } = await dialog.showMessageBox(mainWindow, {
        title: t('box.vcruntime.notfound.title', 'VCRuntime not installed'),
        message: t(
          'box.vcruntime.notfound.message',
          'The Microsoft Visual C++ Runtimes are not installed, which are required by some games'
        ),
        buttons: [t('box.downloadNow', 'Download now'), t('box.ok', 'Ok')]
      })

      if (response === 0) {
        openUrlOrFile('https://aka.ms/vs/17/release/vc_redist.x86.exe')
        openUrlOrFile('https://aka.ms/vs/17/release/vc_redist.x64.exe')
        dialog.showMessageBox(mainWindow, {
          message: t(
            'box.vcruntime.install.message',
            'The download links for the Visual C++ Runtimes have been opened. Please install both the x86 and x64 versions.'
          )
        })
      }
    } else {
      logInfo('VCRuntime is installed', LogPrefix.Backend)
    }
  })
}

export { getSystemInfo, detectVCRedist }
