import https from 'https'
import fs from 'fs'
import path from 'path'
import unzipper from 'unzipper'
import { readdir, stat } from 'fs/promises'
import { pipeline, ZeroShotClassificationOutput } from '@xenova/transformers'

export interface InstallProgress {
  bytes: string
  eta: string
  folder?: string
  percent?: number
  downSpeed?: number
  diskSpeed?: number
  file?: string
}

type ClassificationResult = {
  exec: string
  result: {
    sequence: string
    labels: string[]
    scores: number[]
  }
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

export function downloadAndExtractZip(
  url: string,
  outputDir: string,
  progressCallback: (progress: InstallProgress) => void
): Promise<void> {
  const tempZipPath = path.join(outputDir, 'temp.zip')
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const total = parseInt(res.headers['content-length'] || '0', 10)
        if (!total) {
          console.error('Missing content-length header.')
          return
        }

        let downloaded = 0
        const startTime = Date.now()

        res.on('data', (chunk) => {
          downloaded += chunk.length
          const elapsed = (Date.now() - startTime) / 1000
          const speed = downloaded / elapsed // bytes/sec
          const remaining = total - downloaded
          const eta = speed > 0 ? remaining / speed : 0

          progressCallback({
            bytes: formatBytes(downloaded),
            percent: +((downloaded / total) * 100).toFixed(2),
            eta: formatEta(eta),
            downSpeed: +(speed / 1024).toFixed(2), // KB/s
            folder: outputDir,
            file: path.basename(tempZipPath)
          })
        })

        const fileStream = fs.createWriteStream(tempZipPath)
        res.pipe(fileStream)

        fileStream.on('finish', () => {
          fs.createReadStream(tempZipPath)
            .pipe(unzipper.Extract({ path: outputDir }))
            .on('close', () => {
              fs.unlinkSync(tempZipPath)
              resolve()
            })
        })
      })
      .on('error', (err) => {
        // TODO(alex-min): Add logger
        reject(err)
      })
  })
}

export async function findAllExeFiles(dir: string): Promise<string[]> {
  const items = await readdir(dir)
  const exeFiles: string[] = []

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const itemStat = await stat(fullPath)

    if (itemStat.isDirectory()) {
      const nestedExeFiles = await findAllExeFiles(fullPath)
      exeFiles.push(...nestedExeFiles)
    } else if (path.extname(item).toLowerCase() === '.exe') {
      exeFiles.push(fullPath)
    }
  }

  return exeFiles
}

export async function findMainGameExecutable(dir: string) {
  let executables = await findAllExeFiles(dir)
  if (!executables.length) {
    return null
  }

  const classifier = await pipeline(
    'zero-shot-classification',
    'MoritzLaurer/deberta-v3-xsmall-zeroshot-v1.1-all-33'
  )
  let results: ClassificationResult[] = []
  for (let executable of executables) {
    results.push({
      exec: executable,
      result: (await classifier(executable, [
        'game',
        'installer',
        'tool',
        'irrelevant'
      ])) as ZeroShotClassificationOutput
    })
  }
  return findBestGameExecutable(results)
}

function findBestGameExecutable(
  results: ClassificationResult[]
): string | null {
  let bestMatch: string | null = null
  let highestScore = 0

  for (const { exec, result } of results) {
    const gameIndex = result.labels.indexOf('game')
    if (gameIndex === -1) continue

    const gameScore = result.scores[gameIndex]
    if (gameScore > highestScore) {
      highestScore = gameScore
      bestMatch = exec
    }
  }

  return bestMatch
}

export async function fakeDownloadAndExtractZip(
  url: string,
  outputDir: string,
  progressCallback: (progress: InstallProgress) => void
): Promise<void> {
  const totalBytes = 100 * 1024 * 1024 // 100 MB
  const duration = 300 // 5 minutes in seconds
  const interval = 1000 // 1 second
  const startTime = Date.now()
  let elapsed = 0
  let downloaded = 0

  return new Promise((resolve) => {
    const timer = setInterval(() => {
      elapsed = (Date.now() - startTime) / 1000
      const percent = Math.min((elapsed / duration) * 100, 100)
      downloaded = Math.min((elapsed / duration) * totalBytes, totalBytes)
      const remaining = duration - elapsed
      const speed = downloaded / elapsed

      progressCallback({
        bytes: formatBytes(downloaded),
        percent: +percent.toFixed(2),
        eta: formatEta(remaining),
        downSpeed: +(speed / 1024).toFixed(2),
        folder: outputDir,
        file: 'mock.zip'
      })

      if (elapsed >= duration) {
        clearInterval(timer)
        console.log('Fake download and extraction complete.')
        resolve()
      }
    }, interval)
  })
}
