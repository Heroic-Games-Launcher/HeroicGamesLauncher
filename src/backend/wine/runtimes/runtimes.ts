import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  rmSync
} from 'graceful-fs'
import { join } from 'path'
import { runtimePath } from './../../constants'
import { logError, logInfo, LogPrefix } from './../../logger/logger'
import { Runtime, RuntimeName } from 'common/types'
import { downloadFile, extractTarFile } from './util'
import { axiosClient } from 'backend/utils'

async function _get(): Promise<Runtime[]> {
  mkdirSync(runtimePath, { recursive: true })
  const allRuntimes = await axiosClient.get('https://lutris.net/api/runtimes')
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

    const tarFileName = runtime.url.split('/').pop()!
    const tarFilePath = join(runtimePath, tarFileName)
    await downloadFile(runtime.url, tarFilePath)

    const extractedFolderPath = join(runtimePath, name)

    if (existsSync(extractedFolderPath)) {
      rmSync(extractedFolderPath, { recursive: true })
    }

    await extractTarFile(tarFilePath, {
      extractedPath: extractedFolderPath,
      strip: 1
    })

    writeFileSync(
      join(extractedFolderPath, 'current_version'),
      runtime.created_at
    )

    unlinkSync(tarFilePath)

    return true
  } catch (error) {
    logError(
      ['Failed to download runtime', `${name}:`, error],
      LogPrefix.Runtime
    )
    return false
  }
}

async function isInstalled(name: RuntimeName) {
  if (!existsSync(join(runtimePath, name))) return false

  const runtimes = await _get().catch(() => [])
  const runtime = runtimes.find((inst) => inst.name === name)

  // this should be impossible, so prevent redownload by faking it's installed
  if (!runtime) {
    logError('Runtime not found in runtime list', LogPrefix.Runtime)
    return true
  }

  const version_path = join(runtimePath, name, 'current_version')

  if (!existsSync(version_path)) return false

  const current_version = readFileSync(version_path)

  return runtime.created_at === current_version.toString()
}

export { download, isInstalled }
