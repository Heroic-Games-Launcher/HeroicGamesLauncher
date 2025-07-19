import https from 'https'
import fs from 'fs'
import path from 'path'
import unzipper from 'unzipper'
import { readdir, stat } from 'fs/promises'
import { URL } from 'url'
import { GameInfo } from 'common/types'

export interface InstallProgress {
  bytes: string
  eta: string
  folder?: string
  percent?: number
  downSpeed?: number
  diskSpeed?: number
  file?: string
}

function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

function formatEta(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}m ${s}s`
}

export function downloadAndExtract(
  url: string,
  outputDir: string,
  progressCallback: (progress: InstallProgress) => void
): Promise<void> {
  const executables = [
    'application/octet-stream',
    'application/x-msi',
    'binary/octet-stream'
  ]
  if (fs.existsSync(path.join(outputDir, '__extracted_successfully.txt'))) {
    return new Promise((resolve) => resolve())
  }
  const outFilePath = path.join(outputDir, 'temp.dl')
  let finalFileName = ''
  return new Promise((resolve, reject) => {
    let downloadedBytes = 0
    if (fs.existsSync(outFilePath)) {
      downloadedBytes = fs.statSync(outFilePath).size
    }
    https
      .get(
        url,
        {
          headers:
            downloadedBytes > 0 ? { Range: `bytes=${downloadedBytes}-` } : {}
        },
        (res) => {
          const acceptRanges = res.headers['accept-ranges'] === 'bytes'
          console.log({ headers: res.headers })
          console.log({ code: res.statusCode })
          const statusResumable = acceptRanges
          const canResume =
            acceptRanges && downloadedBytes > 0 && statusResumable
          const total =
            parseInt(res.headers['content-length'] || '0', 10) +
            (canResume ? downloadedBytes : 0)

          if (!total) {
            reject(new Error('missing content length'))
          }
          finalFileName = path.join(
            outputDir,
            path.basename(new URL(url).pathname)
          )

          let downloaded = 0
          const startTime = Date.now()

          res.on('data', (chunk) => {
            downloaded += chunk.length
            const elapsed = (Date.now() - startTime) / 1000
            const speed =
              downloadedBytes > 0
                ? (downloaded - downloadedBytes) / elapsed
                : downloaded / elapsed
            const remaining = total - downloaded
            const eta = speed > 0 ? remaining / speed : 0

            progressCallback({
              bytes: formatBytes(downloaded),
              percent: +((downloaded / total) * 100).toFixed(2),
              eta: formatEta(eta),
              downSpeed: +(speed / 1024).toFixed(2), // KB/s
              folder: outputDir,
              file: path.basename(outFilePath)
            })
          })

          const fileStream = fs.createWriteStream(outFilePath, {
            flags: canResume ? 'a' : 'w'
          })
          res.pipe(fileStream)

          fileStream.on('finish', () => {
            if (executables.includes(res.headers['content-type'] || '')) {
              fs.renameSync(outFilePath, finalFileName)
              return resolve()
            }
            fs.createReadStream(outFilePath)
              .pipe(unzipper.Extract({ path: outputDir }))
              .on('close', () => {
                fs.writeFileSync(
                  path.join(outputDir, '__extracted_successfully.txt'),
                  ''
                )
                fs.unlinkSync(outFilePath)
                resolve()
              })
          })
        }
      )
      .on('error', (err) => reject(err))
      .end()
  })
}

export async function findAllFiles(
  dirs: string | string[],
  extension: string | undefined = undefined
): Promise<string[]> {
  const exeFiles: string[] = []
  if (typeof dirs == 'string') {
    dirs = [dirs]
  }
  for (const dir of dirs) {
    const items = await readdir(dir)

    for (const item of items) {
      const fullPath = path.join(dir, item)
      const itemStat = await stat(fullPath)

      if (itemStat.isDirectory()) {
        const nestedExeFiles = await findAllFiles(fullPath, extension)
        exeFiles.push(...nestedExeFiles)
      } else if (!extension || path.extname(item).toLowerCase() === extension) {
        exeFiles.push(fullPath)
      }
    }
  }
  return exeFiles
}

export async function findMainGameExecutable(
  game: GameInfo,
  dir: string | string[],
  extension = '.exe'
) {
  const executables = await findAllFiles(dir, extension)
  if (!executables.length) {
    return null
  }

  if (executables.length == 1) {
    return executables[0]
  }

  // We have multiple executables for this game
  // we best guess which is the right one
  // we might be wrong and some exceptions will be added by app_name here
  const scores: { [key: string]: number } = {}
  executables.forEach((exec) => {
    scores[exec] ??= 0

    const title = game.title.replace(/[^a-zA-Z0-9 ]/g, '')

    // positive signals in the name
    ;[
      title,
      game.app_name,
      ...title.split(' '),
      title.split(' ').join('')
    ].forEach((signal) => {
      scores[exec] += exec.match(new RegExp(signal, 'gi'))?.length ?? 0
    })

    // very positive signals
    ;['launch', 'game', 'start'].forEach((signal) => {
      scores[exec] += (exec.match(new RegExp(signal, 'gi'))?.length ?? 0) * 10
    })

    // very negative signals in the name
    ;[
      'uninstall',
      'configure',
      'unins000',
      'restore',
      'Joy2Key',
      'readme',
      'DirectX',
      'DXSETUP'
    ].forEach((signal) => {
      scores[exec] -= (exec.match(new RegExp(signal, 'gi'))?.length ?? 0) * 10
    })
  })

  const [bestExecutable] = Object.entries(scores).reduce((best, current) =>
    current[1] > best[1] ? current : best
  )
  return bestExecutable
}
