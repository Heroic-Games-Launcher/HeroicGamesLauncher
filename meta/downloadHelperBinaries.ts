import { createWriteStream } from 'fs'
import { chmod, stat } from 'fs/promises'
import { join } from 'path'

import { fromBuffer as zipFromBuffer, type Entry } from 'yauzl'

type SupportedPlatform = 'win32' | 'darwin' | 'linux'

const RUN_IDS = {
  legendary: '9260477327',
  gogdl: '9554628031',
  nile: '9428563942'
} as const

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
  platform: SupportedPlatform,
  filename: string
) {
  const url = `https://nightly.link/${repo}/actions/runs/${runid}/${filename}`
  console.log('Downloading', binaryName, 'for', platform, 'from', url)

  const fileBuffer = await downloadFile(url)

  const exeFilename = binaryName + (platform === 'win32' ? '.exe' : '')
  const exePath = join('public', 'bin', platform, exeFilename)
  await pickFileFromZipFile(fileBuffer, exeFilename, exePath)
  console.log('Done downloading', binaryName, 'for', platform)

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
  assetNames: Partial<Record<SupportedPlatform, string>>
) {
  const downloadPromises = Object.entries(assetNames).map(
    async ([platform, filename]) => {
      if (!filename) return
      return downloadAsset(
        binaryName,
        repo,
        runid,
        platform as SupportedPlatform,
        filename + '.zip'
      )
    }
  )

  return Promise.all(downloadPromises)
}

async function downloadLegendary() {
  return downloadGithubAssets(
    'legendary',
    'Heroic-Games-Launcher/legendary',
    RUN_IDS['legendary'],
    {
      linux: 'Linux-package',
      darwin: 'macOS-package',
      win32: 'Windows-package'
    }
  )
}

async function downloadGogdl() {
  return downloadGithubAssets(
    'gogdl',
    'Heroic-Games-Launcher/heroic-gogdl',
    RUN_IDS['gogdl'],
    {
      linux: 'gogdl-Linux',
      darwin: 'gogdl-macOS',
      win32: 'gogdl-Windows'
    }
  )
}

async function downloadNile() {
  return downloadGithubAssets('nile', 'imLinguin/nile', RUN_IDS['nile'], {
    linux: 'nile-Linux',
    darwin: 'nile-macOS',
    win32: 'nile-Windows'
  })
}

async function main() {
  if (!(await pathExists('public/bin'))) {
    console.error('public/bin not found, are you in the source root?')
    return
  }

  return Promise.all([downloadLegendary(), downloadGogdl(), downloadNile()])
}

void main()
