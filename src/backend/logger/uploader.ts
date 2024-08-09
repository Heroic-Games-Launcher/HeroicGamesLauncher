import { app } from 'electron'
import { open } from 'fs/promises'
import path from 'path'
import { z } from 'zod'

import { TypeCheckedStoreBackend } from '../electron_store'
import { getLogFile } from './logfile'
import { logError, logInfo, LogPrefix } from './logger'
import { sendFrontendMessage } from '../main_window'

import type { UploadedLogData } from 'common/types'

const uploadedLogFileStore = new TypeCheckedStoreBackend('uploadedLogs', {
  cwd: 'store',
  name: 'uploadedLogs',
  accessPropertiesByDotNotation: false
})

async function sendRequestToApi(formData: FormData, url = 'https://0x0.st') {
  return fetch(url, {
    body: formData,
    method: 'post',
    headers: {
      'User-Agent': `HeroicGamesLauncher/${app.getVersion()}`
    }
  }).catch((err) => {
    logError([`Failed to send data to 0x0.st:`, err], LogPrefix.LogUploader)
    return null
  })
}

const KiB = 1024
const MiB = KiB * 1024

/**
 * Reads the first `size` bytes of a file
 * @param file The file to read
 * @param size The maximum number of bytes to read
 */
async function readPartOfFile(file: string, size: number) {
  const fileHandle = await open(file, 'r')

  const fileSize = (await fileHandle.stat()).size
  size = Math.min(size, fileSize)

  const buffer = Buffer.alloc(size)
  await fileHandle.read(buffer, 0, size, 0)
  await fileHandle.close()
  return buffer
}

/**
 * Uploads the log file of a game / runner / Heroic to https://0x0.st
 * @param name See {@link UploadedLogData.name}
 * @param appNameOrRunner Used to get the log file path. See {@link getLogFile}
 * @returns `false` if an error occurred, otherwise the URL to the uploaded file and {@link UploadedLogData}
 */
async function uploadLogFile(
  name: string,
  appNameOrRunner: string
): Promise<false | [string, UploadedLogData]> {
  const fileLocation = getLogFile(appNameOrRunner)
  const filename = path.basename(fileLocation)

  const fileContents = await readPartOfFile(fileLocation, 10 * MiB)
  const fileBlob = new Blob([fileContents])

  const formData = new FormData()
  formData.set('file', fileBlob, filename)
  formData.set('expires', '24')

  const response = await sendRequestToApi(formData)
  if (!response) return false

  const token = response.headers.get('X-Token')
  const responseText = (await response.text()).trim()
  const maybeUrl = z.string().url().safeParse(responseText)
  if (!response.ok || !token || !maybeUrl.success) {
    logError(
      [
        `Failed to upload log file, response error code ${response.status} ${response.statusText}, text:`,
        responseText
      ],
      LogPrefix.LogUploader
    )
    return false
  }

  const url = maybeUrl.data
  const uploadData: UploadedLogData = {
    name,
    token,
    uploadedAt: Date.now()
  }
  uploadedLogFileStore.set(url, uploadData)
  sendFrontendMessage('logFileUploaded', url, uploadData)
  logInfo(`Uploaded log file ${name} to ${url}`, LogPrefix.LogUploader)
  return [url, uploadData]
}

/**
 * Deletes a log file previously uploaded using {@link uploadLogFile}
 * @param url The URL to the uploaded log file
 * @returns Whether the file was deleted
 */
async function deleteUploadedLogFile(url: string): Promise<boolean> {
  const logData = uploadedLogFileStore.get_nodefault(url)
  if (!logData) return false

  const formData = new FormData()
  formData.set('token', logData.token)
  formData.set('delete', '')

  const response = await sendRequestToApi(formData, url)
  if (!response) return false

  if (!response.ok) {
    logError(
      [
        `Failed to delete log file upload, response error code ${response.status} ${response.statusText}, text:`,
        await response.text()
      ],
      LogPrefix.LogUploader
    )
    return false
  }

  uploadedLogFileStore.delete(url)
  sendFrontendMessage('logFileUploadDeleted', url)
  logInfo([`Deleted log file ${logData.name} (${url})`], LogPrefix.LogUploader)

  return true
}

/**
 * Returns all log files which are still valid. Also deletes expired
 * ones from {@link uploadedLogFileStore}
 */
async function getUploadedLogFiles(): Promise<Record<string, UploadedLogData>> {
  const allStoredLogs = uploadedLogFileStore.raw_store
  const validUploadedLogs: Record<string, UploadedLogData> = {}
  // Filter and delete expired logs
  for (const [key, value] of Object.entries(allStoredLogs)) {
    const timeDifferenceMs = Date.now() - value.uploadedAt
    const timeDifferenceHours = timeDifferenceMs / 1000 / 60 / 60
    if (timeDifferenceHours >= 24) {
      uploadedLogFileStore.delete(key)
    } else {
      validUploadedLogs[key] = value
    }
  }
  return validUploadedLogs
}

export { uploadLogFile, deleteUploadedLogFile, getUploadedLogFiles }
