import axios from 'axios'
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'graceful-fs'
import { join } from 'path'
import { runtimePath } from './../../constants'
import { logDebug, LogPrefix } from './../../logger/logger'
import { Runtime, RuntimeName } from './../../types'
import { extractTarFile, getAssetDataFromDownload } from './util'

async function _get(): Promise<Runtime[]> {
  mkdirSync(runtimePath, { recursive: true })
  const allRuntimes = await axios.get('https://lutris.net/api/runtimes')
  return allRuntimes.data
}

async function download(name: RuntimeName) {
  const runtimes = await _get()
  const runtime = runtimes.find((inst) => {
    return inst.name === name
  })
  logDebug(
    ['Downloading runtime', name, 'with download link', runtime.url],
    LogPrefix.Runtime
  )
  const { name: tarFileName, content_type } = await getAssetDataFromDownload(
    runtime.url
  )
  const rawData = (
    await axios.get(runtime.url, { responseType: 'arraybuffer' })
  ).data
  const tarFilePath = join(runtimePath, tarFileName)
  writeFileSync(tarFilePath, rawData)
  const extractedFolderPath = join(runtimePath, name)
  await extractTarFile(tarFilePath, content_type, extractedFolderPath)
  unlinkSync(tarFilePath)
}

function isInstalled(name: RuntimeName) {
  return existsSync(join(runtimePath, name))
}

export { download, isInstalled }
