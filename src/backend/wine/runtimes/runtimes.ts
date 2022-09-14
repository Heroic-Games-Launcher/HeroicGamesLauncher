import axios from 'axios'
import { existsSync, mkdirSync, unlinkSync } from 'graceful-fs'
import { join } from 'path'
import { runtimePath } from './../../constants'
import { logError, logInfo, LogPrefix } from './../../logger/logger'
import { Runtime, RuntimeName } from 'common/types'
import { downloadFile, extractTarFile, getAssetDataFromDownload } from './util'

async function _get(): Promise<Runtime[]> {
  mkdirSync(runtimePath, { recursive: true })
  const allRuntimes = await axios.get('https://lutris.net/api/runtimes')
  if (!allRuntimes.data) {
    logError('Failed to fetch runtime list', LogPrefix.Runtime)
  }
  return allRuntimes.data || []
}

async function download(name: RuntimeName): Promise<boolean> {
  try {
    const runtimes = await _get()
    const runtime = runtimes.find((inst) => {
      return inst.name === name
    })
    if (!runtime) {
      throw new Error(`Runtime ${name} was not found in runtime list`)
    }
    logInfo(
      ['Downloading runtime', name, 'with download link', runtime.url],
      LogPrefix.Runtime
    )

    const { name: tarFileName, content_type } = await getAssetDataFromDownload(
      runtime.url
    )
    const tarFilePath = join(runtimePath, tarFileName)
    await downloadFile(runtime.url, tarFilePath)

    const extractedFolderPath = join(runtimePath, name)
    await extractTarFile(tarFilePath, content_type, {
      extractedPath: extractedFolderPath,
      strip: 1
    })

    unlinkSync(tarFilePath)

    return true
  } catch (error) {
    logError(
      [
        'Failed to download runtime',
        `${name}:`,
        error instanceof Error ? error.stack ?? error.message : `${error}`
      ],
      LogPrefix.Runtime
    )
    return false
  }
}

function isInstalled(name: RuntimeName) {
  return existsSync(join(runtimePath, name))
}

export { download, isInstalled }
