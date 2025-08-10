import { join } from 'path'
import { downloadFile, sendProgressUpdate } from 'backend/utils'
import { DownloadTask } from 'backend/storeManagers/customLibraries/tasks/types'

export async function executeDownloadTask(
  appName: string,
  task: DownloadTask,
  gameFolder: string
): Promise<void> {
  const destination = task.destination || ''
  const destinationFolder = join(gameFolder, destination)

  // Determine filename
  let filename = task.filename
  if (!filename) {
    filename = determineDownloadFilename(task.url, appName)
  }

  const downloadPath = join(destinationFolder, filename)

  await downloadFile({
    url: task.url,
    dest: downloadPath,
    progressCallback: (bytes: number, speed: number, percentage: number) => {
      sendProgressUpdate({
        appName,
        runner: 'customLibrary',
        status: 'installing',
        progress: {
          bytes: `${Math.round((bytes / 1024 / 1024) * 100) / 100}MB`,
          eta: '',
          percent: Math.round(percentage)
        }
      })
    }
  })
}

function determineDownloadFilename(
  downloadUrl: string,
  appName: string
): string {
  let filename = `${appName}_download`

  try {
    const url = new URL(downloadUrl)
    const pathFilename = url.pathname.split('/').pop()

    if (
      pathFilename &&
      pathFilename !== '/' &&
      !pathFilename.includes('.php') &&
      !pathFilename.includes('.asp')
    ) {
      filename = pathFilename
    } else {
      // Check URL parameters for download links
      const possibleParams = [
        'mirror',
        'url',
        'file',
        'download',
        'link',
        'redirect'
      ]
      for (const param of possibleParams) {
        if (url.searchParams.has(param)) {
          try {
            const paramValue = decodeURIComponent(url.searchParams.get(param)!)
            const paramUrl = new URL(paramValue)
            const paramFilename = paramUrl.pathname.split('/').pop()
            if (paramFilename) {
              filename = paramFilename
              break
            }
          } catch {
            // Continue to next parameter
          }
        }
      }
    }
  } catch {
    // Use default filename
  }

  return filename
}
