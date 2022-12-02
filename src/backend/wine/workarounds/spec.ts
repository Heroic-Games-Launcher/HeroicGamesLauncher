import { GameSettings } from 'common/types'
import { logError, LogPrefix } from 'backend/logger/logger'
import { extractTarFile } from '../runtimes/util'
import { join } from 'path'
import { heroicToolsPath } from 'backend/constants'
import {
  dllInstaller,
  downloadGithubReleaseAsset,
  storeModifiedDlls
} from './util'

export const Workarounds = {
  dxvk: {
    install: async (settings: GameSettings, version: string) => {
      let archivePath, asset
      try {
        ;({ archivePath, asset } = await downloadGithubReleaseAsset(
          'https://api.github.com/repos/doitsujin/dxvk/releases',
          join(heroicToolsPath, 'DXVK'),
          (release) => 'tag_name' in release && release.tag_name === version,
          (asset) =>
            asset.name.startsWith('dxvk-') &&
            !asset.name.startsWith('dxvk-native')
        ))
      } catch (error) {
        logError(['Unable to download DXVK:', error], {
          prefix: LogPrefix.DXVKInstaller
        })
        return false
      }

      let extractedPath
      try {
        extractedPath = await extractTarFile(archivePath, asset.content_type)
      } catch (error) {
        logError(['Unable to extract DXVK archive', error], {
          prefix: LogPrefix.DXVKInstaller
        })
        return false
      }

      let installedDlls
      try {
        installedDlls = await dllInstaller(extractedPath, settings)
      } catch (error) {
        logError(['Unable to install DXVK DLLs:', error], {
          prefix: LogPrefix.DXVKInstaller
        })
        return false
      }

      const fullPrefix =
        settings.wineVersion.type === 'proton'
          ? join(settings.winePrefix, 'pfx')
          : settings.winePrefix
      storeModifiedDlls(installedDlls, 'dxvk', fullPrefix)

      return true
    },
    remove: (settings: GameSettings) => {
      // TODO
      return true
    },
    isInstalled: (settings: GameSettings) => {
      // TODO
      return false
    }
  },
  vkd3d: {
    install: (settings: GameSettings, version: string) => {
      // TODO
      return false
    },
    remove: (settings: GameSettings) => {
      // TODO
      return true
    },
    isInstalled: (settings: GameSettings) => {
      // TODO
      return false
    }
  }
}
