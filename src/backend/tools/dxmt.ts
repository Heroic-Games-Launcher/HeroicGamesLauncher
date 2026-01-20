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
      // copy wine
      cpSync(wineFilePath, wineCopyFilePath, { recursive: true })

      // copy dxmt files inside wine
      const globalVersion = readFileSync(join(toolsPath, 'dxmt', 'latest_dxmt'))
        .toString()
        .split('\n')[0]

      const toolPath = join(toolsPath, 'dxmt', globalVersion)
      const wineInternalPath = join(
        wineCopyFilePath,
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
          `Copying ${join(toolPath, file)} in ${join(wineInternalPath, file)}`,
          LogPrefix.ToolInstaller
        )
        copyFileSync(join(toolPath, file), join(wineInternalPath, file))
      })

      // rename version in info.plist
      const infoFilePath = join(wineCopyFilePath, 'Contents', 'Info.plist')
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
