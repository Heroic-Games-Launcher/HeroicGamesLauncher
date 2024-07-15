import { createWriteStream } from 'fs'
import { chmod, stat, mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

import { fromBuffer as zipFromBuffer, type Entry } from 'yauzl'

type SupportedPlatform = 'win32' | 'darwin' | 'linux'
type DownloadedBinary = 'legendary' | 'gogdl' | 'nile'

const RUN_IDS = {
  legendary: '9939390786',
  gogdl: '9939144003',
  nile: '9938994045'
} as const satisfies Record<DownloadedBinary, string>

const pathExists = async (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false
  )

async function downloadFile(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'HeroicBinaryUpdater/1.0'
    }
  })
  return Buffer.from(await response.arrayBuffer())
}

/**
 * Finds a file in a ZIP file and writes it into destination
 * @param zipBuffer The ZIP file to search through
 * @param filename The file to look for
 * @param destination The destination for filename to go to
 */
async function pickFileFromZipFile(
  zipBuffer: Buffer,
  filename: string,
  destination: string
) {
  return new Promise<void>((resolve, reject) => {
    zipFromBuffer(zipBuffer, (err, zipfile) => {
      if (err) reject(err)

      zipfile.on('entry', (entry: Entry) => {
        if (entry.fileName !== filename) return

        zipfile.openReadStream(entry, (err, stream) => {
          if (err) reject(err)
          const destWriteStream = createWriteStream(destination)
          stream.pipe(destWriteStream)
          stream.on('end', resolve)
          stream.on('error', reject)
        })
      })
    })
  })
}

async function downloadAsset(
  binaryName: string,
  repo: string,
  runid: string,
  arch: string,
  platform: SupportedPlatform,
  filename: string
) {
  const url = `https://nightly.link/${repo}/actions/runs/${runid}/${filename}`
  console.log('Downloading', binaryName, 'for', platform, arch, 'from', url)

  const fileBuffer = await downloadFile(url)

  const exeFilename = binaryName + (platform === 'win32' ? '.exe' : '')
  const exeDir = join('public', 'bin', arch, platform)
  const exePath = join(exeDir, exeFilename)

  await mkdir(exeDir, { recursive: true })
  await pickFileFromZipFile(fileBuffer, exeFilename, exePath)
  console.log('Done downloading', binaryName, 'for', platform, arch)

  if (platform !== 'win32') {
    await chmod(exePath, '755')
  }
}

/**
 * Downloads assets uploaded by a GitHub action
 * @param binaryName The binary which was built & uploaded. Also used to get the final folder path
 * @param repo The repo to download from
 * @param runid The GitHub Actions run ID which produced the binaries
 * @param assetNames The name(s) of the assets which were uploaded, mapped to platforms
 */
async function downloadGithubAssets(
  binaryName: string,
  repo: string,
  runid: string,
  assetNames: Record<
    'x64' | 'arm64',
    Partial<Record<SupportedPlatform, string>>
  >
) {
  const downloadPromises = Object.entries(assetNames).map(
    async ([arch, plarform_filename_map]) =>
      Promise.all(
        Object.entries(plarform_filename_map).map(([platform, filename]) => {
          if (!filename) return
          return downloadAsset(
            binaryName,
            repo,
            runid,
            arch,
            platform as keyof typeof plarform_filename_map,
            filename + '.zip'
          )
        })
      )
  )

  return Promise.all(downloadPromises)
}

async function downloadLegendary() {
  return downloadGithubAssets(
    'legendary',
    'Heroic-Games-Launcher/legendary',
    RUN_IDS['legendary'],
    {
      x64: {
        linux: 'ubuntu-20.04-package',
        darwin: 'macos-12-package',
        win32: 'windows-2022-package'
      },
      arm64: {
        darwin: 'macos-14-package'
      }
    }
  )
}

async function downloadGogdl() {
  return downloadGithubAssets(
    'gogdl',
    'Heroic-Games-Launcher/heroic-gogdl',
    RUN_IDS['gogdl'],
    {
      x64: {
        linux: 'gogdl-ubuntu-20.04',
        darwin: 'gogdl-macos-12',
        win32: 'gogdl-windows-2022'
      },
      arm64: {
        darwin: 'gogdl-macos-14'
      }
    }
  )
}

async function downloadNile() {
  return downloadGithubAssets('nile', 'imLinguin/nile', RUN_IDS['nile'], {
    x64: {
      linux: 'nile-ubuntu-20.04',
      darwin: 'nile-macos-12',
      win32: 'nile-windows-2022'
    },
    arm64: {
      darwin: 'nile-macos-14'
    }
  })
}

/**
 * Finds out which binaries need to be downloaded by comparing
 * `public/bin/.runids` with RUN_IDS
 */
async function compareDownloadedRunIds(): Promise<DownloadedBinary[]> {
  const storedRunIdsText = await readFile('public/bin/.runids', 'utf-8').catch(
    () => '{}'
  )
  let storedRunIdsParsed: Partial<Record<DownloadedBinary, string>>
  try {
    storedRunIdsParsed = JSON.parse(storedRunIdsText)
  } catch {
    return ['legendary', 'gogdl', 'nile']
  }
  const binariesToDownload: DownloadedBinary[] = []
  for (const [runner, currentRunId] of Object.entries(RUN_IDS)) {
    if (storedRunIdsParsed[runner] !== currentRunId)
      binariesToDownload.push(runner as keyof typeof RUN_IDS)
  }
  return binariesToDownload
}

async function storeDownloadedRunIds() {
  await writeFile('public/bin/.runids', JSON.stringify(RUN_IDS))
}

async function main() {
  if (!(await pathExists('public/bin'))) {
    console.error('public/bin not found, are you in the source root?')
    return
  }

  const binariesToDownload = await compareDownloadedRunIds()
  if (!binariesToDownload.length) {
    console.log('Nothing to download, binaries are up-to-date')
    return
  }

  console.log('Downloading:', binariesToDownload)
  const promisesToAwait: Promise<unknown>[] = []

  if (binariesToDownload.includes('legendary'))
    promisesToAwait.push(downloadLegendary())
  if (binariesToDownload.includes('gogdl'))
    promisesToAwait.push(downloadGogdl())
  if (binariesToDownload.includes('nile')) promisesToAwait.push(downloadNile())

  await Promise.all(promisesToAwait)

  await storeDownloadedRunIds()
}

void main()
