import { join } from 'path'
import { axiosClient, downloadFile, sendProgressUpdate } from 'backend/utils'
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
    filename = await determineDownloadFilename(task.url)
  }

  if (!filename) {
    throw new Error('Could not determine filename for download')
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

async function determineDownloadFilename(downloadUrl: string): Promise<string> {
  let filename = ''

  try {
    const response = await axiosClient.head(downloadUrl)
    const contentDisposition = response.headers['content-disposition']
    const filenameMatch = contentDisposition?.match(
      /filename\*?=(?:"([^"]+)"|([^;]+))/i
    )
    if (filenameMatch) {
      filename = filenameMatch[1] || filenameMatch[2]
      // Handle URL encoding in filename* format
      if (contentDisposition.includes('filename*=')) {
        try {
          filename = decodeURIComponent(filename.split("''")[1] || filename)
        } catch {
          // Use as-is if decoding fails
        }
      }
      filename = filename.trim().replace(/^"|"$/g, '') // Remove surrounding quotes
    }
  } catch {
    // If HEAD request fails, fall back to URL parsing
  }

  if (filename) {
    return filename
  }

  // Fallback to URL parsing if Content-Disposition didn't provide a filename
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
      const allowedExtensions =
        /\.(zip|exe|msi|dmg|pkg|tar|gz|rar|7z|deb|rpm|iso|bin|apk)$/i
      // Check all URL parameters for potential filenames
      for (const [, value] of url.searchParams.entries()) {
        if (!value) continue

        try {
          // First try to parse as URL to extract filename
          const paramUrl = new URL(value)
          const paramFilename = paramUrl.pathname.split('/').pop()
          if (paramFilename && allowedExtensions.test(paramFilename)) {
            filename = paramFilename
            break
          }
        } catch {
          // If it's not a URL, check if the value itself looks like a filename
          if (allowedExtensions.test(value)) {
            filename = value
            break
          }
        }
      }
    }
  } catch {
    // Use default filename
  }

  return filename
}
