import { backendEvents } from 'backend/backend_events'
import { isIntelMac, isMac } from 'backend/constants/environment'
import { logDebug, logError, LogPrefix, logWarning } from 'backend/logger'
import { isOnline } from 'backend/online_monitor'
import { installOrUpdateTool } from '.'
import { Tool, WineVersionInfo } from 'common/types'
import { join } from 'path'
import {
  copyFileSync,
  cpSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'graceful-fs'
import { toolsPath } from 'backend/constants/paths'
import { wineDownloaderInfoStore } from 'backend/wine/manager/utils'

const DXMT = {
  getLatest: () => {
    if (!isOnline()) {
      logWarning(
        'App offline, skipping possible DXMT update.',
        LogPrefix.ToolInstaller
      )
      return
    }

    const tool: Tool = {
      name: 'dxmt',
      url: 'https://api.github.com/repos/3Shain/dxmt/releases/latest',
      os: 'darwin'
    }

    return installOrUpdateTool(tool)
  },
  copyWineAndConfigure: async (
    versionInfo: WineVersionInfo,
    installDir: string
  ) => {
    const wineFilePath = join(installDir, versionInfo.version)
    const wineCopyFilePath = `${wineFilePath}-DXMT`
    try {
      cpSync(wineFilePath, wineCopyFilePath, { recursive: true })

      DXMT.copyLatestDXMTFiles(wineCopyFilePath)

      DXMT.addDXMTSuffixInPlist(wineCopyFilePath)
    } catch (error) {
      logError(
        `Error copying wine staging for DXMT version ${error}`,
        LogPrefix.ToolInstaller
      )
      if (existsSync(wineCopyFilePath)) {
        rmSync(wineCopyFilePath, { recursive: true })
      }
    }
  },
  getCurrentDXMTVersion: () => {
    const versionFilePath = join(toolsPath, 'dxmt', 'latest_dxmt')
    if (existsSync(versionFilePath)) {
      return readFileSync(versionFilePath).toString().split('\n')[0]
    } else {
      return ''
    }
  },
  deleteWineCopy: async (versionInfo: WineVersionInfo) => {
    const dxmtVersionPath = `${versionInfo.installDir}-DXMT`
    if (versionInfo.installDir !== undefined && existsSync(dxmtVersionPath)) {
      try {
        rmSync(dxmtVersionPath, { recursive: true })
      } catch (error) {
        logError(error, LogPrefix.ToolInstaller)
        logWarning(
          `Couldn't remove DXMT copy of ${versionInfo.version}!`,
          LogPrefix.ToolInstaller
        )
      }
    }
  },

  copyLatestDXMTFiles: (pathToWine: string) => {
    const dxmtVersion = DXMT.getCurrentDXMTVersion()

    const pathToDXMT = join(toolsPath, 'dxmt', dxmtVersion)

    const wineInternalPath = join(
      pathToWine,
      'Contents',
      'Resources',
      'wine',
      'lib',
      'wine'
    )

    const filesToCopy = [
      'x86_64-windows/d3d10core.dll',
      'x86_64-windows/d3d11.dll',
      'x86_64-windows/dxgi.dll',
      'x86_64-windows/nvapi64.dll',
      'x86_64-windows/nvngx.dll',
      'x86_64-windows/winemetal.dll',
      'x86_64-unix/winemetal.so',
      'i386-windows/d3d10core.dll',
      'i386-windows/d3d11.dll',
      'i386-windows/dxgi.dll',
      'i386-windows/winemetal.dll'
    ]

    filesToCopy.forEach((file) => {
      logDebug(
        `Copying ${join(pathToDXMT, file)} in ${join(wineInternalPath, file)}`,
        LogPrefix.ToolInstaller
      )
      copyFileSync(join(pathToDXMT, file), join(wineInternalPath, file))
    })
  },
  addDXMTSuffixInPlist: (pathToWine: string) => {
    const infoFilePath = join(pathToWine, 'Contents', 'Info.plist')
    let content = readFileSync(infoFilePath, 'utf8')
    content = content.replace(
      /(<key>CFBundleShortVersionString<\/key>\n.*<string>)(.*)(<\/string>)/m,
      '$1$2-DXMT$3'
    )
    content = content.replace(
      /(<key>CFBundleVersion<\/key>\n.*<string>)(.*)(<\/string>)/m,
      '$1$2-DXMT$3'
    )

    writeFileSync(infoFilePath, content)
  }
}

backendEvents.on('wineVersionInstalled', async (versionInfo, installDir) => {
  if (isMac && !isIntelMac && versionInfo.type === 'Wine-Staging-macOS') {
    await DXMT.getLatest()
    await DXMT.copyWineAndConfigure(versionInfo, installDir)
  }
})

backendEvents.on('wineVersionUninstalled', async (versionInfo) => {
  if (isMac && !isIntelMac && versionInfo.type === 'Wine-Staging-macOS') {
    await DXMT.deleteWineCopy(versionInfo)
  }
})

// Update DXMT version in `*-DXMT` wines if new version available
backendEvents.on('releasesInfoReady', async (releasesInfo) => {
  if (!isMac || isIntelMac) return

  // TODO: should we store just the version instead of the file name?
  const currentDXMTVersion = DXMT.getCurrentDXMTVersion()
    .replace(/.*dxmt-/, '')
    .replace(/-builtin.*/, '')

  if (releasesInfo['dxmt'].tag === currentDXMTVersion) return

  await DXMT.getLatest()

  const availableWines = wineDownloaderInfoStore.get('wine-releases', [])
  const installedWineStagingVersions = availableWines.filter(
    (wine) => wine.type === 'Wine-Staging-macOS' && wine.isInstalled
  )

  installedWineStagingVersions.forEach((wine) => {
    const wineWithDXMTFilePath = `${wine.installDir}-DXMT`

    if (existsSync(wineWithDXMTFilePath))
      DXMT.copyLatestDXMTFiles(wineWithDXMTFilePath)
  })
})
