import { createHash } from 'crypto'
import { createWriteStream } from 'fs'
import { chmod, stat, mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { Readable, Transform } from 'stream'
import { pipeline } from 'stream/promises'

import { setGlobalDispatcher, ProxyAgent } from 'undici'

type SupportedPlatform = 'win32' | 'darwin' | 'linux'
type DownloadedBinary =
  | 'legendary'
  | 'gogdl'
  | 'nile'
  | 'comet'
  | 'epic-integration'

const RELEASE_HASHES = {
  'x64/win32/GalaxyCommunication.exe':
    'abc208076a778ee738cae8451c9be7ab33c9787b0b69b2e7e4ffc70becc39e1e',
  'x64/win32/EpicGamesLauncher.exe':
    '36fcd337ed9396ec7a6263864fafb944fe2bcf70c965c3fe99ce4c0cca572fe2',
  'x64/darwin/gogdl':
    '0d3ea4c72d4914e509ac9ee860d279ddc09a84348d20894b491eac39e2f0dc3c',
  'x64/linux/gogdl':
    '01d7e42821d5310cdc59f09d1b573af7a1e2e35f56741a1076dab9da05fd0cd8',
  'x64/linux/legendary':
    'bbb64b92fd9af97c4dc020aaa2a4bbe392bac84c22d60fc6224805e119842e38',
  'x64/linux/nile':
    '3a8c080c864a5952a01d7661693c60727b34a355ae21e9eab2047096b606c1df',
  'arm64/darwin/legendary':
    '7a08199ce450ca65d68ad00f963136976bf0b51dd529a7c1633d60a3e45d4ff7',
  'arm64/linux/gogdl':
    '2c259c358e05ac15927f769b9691fd190846da3aec8a94804d36ebe5d48ad215',
  'arm64/darwin/nile':
    'a07b64bc48d4754b25acb22895f47ab9e54960ee25efa5ffbfc6e23a5259a377',
  'x64/win32/comet.exe':
    '590a89a83877d0b58ef515ad03865114fbcb3f71fad71d606d72a3eb20a334e9',
  'x64/darwin/legendary':
    '6e99106b0a8225cb78252a6c1df714651dd7190abc319d1ddfd0d00ee761b349',
  'arm64/linux/legendary':
    '7cac5bdbee077153412267758080aae09a6c5160434983378254b7a7a9a004e6',
  'arm64/linux/nile':
    'f5ba63cfeb415ec1f07a980d6a2bbcdf8fc11411e5fa224f838a88fe78ad0008',
  'x64/win32/legendary.exe':
    'd1744e56874042ce474fadb468e00138613a4d241e37689c207df6528af9d83f',
  'x64/darwin/nile':
    '37951bc7f993666a29b5c03135eb0a7f3ce335546eb2e3e59e0e2261d182a263',
  'x64/linux/comet':
    'cf9a0e44dbedd0fea283ac6398e1277df7516711b486c21629103c873b0a6a7d',
  'arm64/linux/comet':
    '7eca0d84d3c0b0e563a732a6300a20c115b5d60d25e44735d18e86a773b97a2f',
  'x64/win32/nile.exe':
    '2d1aea4d6f1171963a9552b9ac2b13f6d25a0f0036729b4cf6ecc2e2ffcd9096',
  'arm64/darwin/gogdl':
    'fab4d21a93cb029ec53ca14c0a741ce078b5b5d5cd7d1bd826e9d71e4a517b64',
  'x64/win32/gogdl.exe':
    '795b0f25359b8fec7d40375c29736da5d304ae5aeed3a944dcf167868081a2b7',
  'arm64/darwin/comet':
    '1275c7b804846bbc70d43445760366d5a9713c506ba67eac7ca51a7fb87c77b5',
  'x64/darwin/comet':
    '18a1e7e304f710165fb22bd0716aeefce4959a023165db9feb10fc918103b778'
}

const RELEASE_TAGS = {
  legendary: '0.20.37',
  gogdl: 'v1.1.2',
  nile: 'v1.1.2',
  comet: 'v0.2.0',
  'epic-integration': 'v0.3'
} as const satisfies Record<DownloadedBinary, string>

const pathExists = async (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    () => false
  )

async function downloadFile(url: string, dst: string) {
  const response = await fetch(url, {
    keepalive: true,
    headers: {
      'User-Agent': 'HeroicBinaryUpdater/1.0'
    }
  })
  if (response.status !== 200) {
    throw Error(`Failed to download ${url}: ${response.status}`)
  }
  await mkdir(dirname(dst), { recursive: true })
  const hash = createHash('sha256')
  let computedHash: string = ''
  const hashTransform = new Transform({
    transform(chunk, encoding, callback) {
      hash.update(chunk)
      callback(null, chunk)
    },
    flush(callback) {
      computedHash = hash.digest('hex')
      callback()
    }
  })
  const fileStream = createWriteStream(dst, { flags: 'w' })
  await pipeline(Readable.fromWeb(response.body), hashTransform, fileStream)

  // Validate the downloaded file hash matches the expected hash
  // Errors when a binary has been swapped out on an existing release
  const system = dst.replace('public/bin/', '')
  if (computedHash !== RELEASE_HASHES[system]) {
    throw Error(
      `- ${system} (Hash mismatch) received '${computedHash}' expected '${RELEASE_HASHES[system]}'`
    )
  }
}

async function downloadAsset(
  binaryName: string,
  repo: string,
  tag_name: string,
  arch: string,
  platform: SupportedPlatform,
  filename: string
) {
  const url = `https://github.com/${repo}/releases/download/${tag_name}/${filename}`
  console.log('Downloading', binaryName, 'for', platform, arch, 'from', url)

  const exeFilename = binaryName + (platform === 'win32' ? '.exe' : '')
  const exePath = join('public', 'bin', arch, platform, exeFilename)
  await downloadFile(url, exePath)

  console.log('Done downloading', binaryName, 'for', platform, arch)

  if (platform !== 'win32') {
    await chmod(exePath, '755')
  }
}

/**
 * Downloads assets uploaded to a GitHub release
 * @param binaryName The binary which was built & uploaded. Also used to get the final folder path
 * @param repo The repo to download from
 * @param tagName The GitHub Release tag which produced the binaries
 * @param assetNames The name(s) of the assets which were uploaded, mapped to platforms
 */
async function downloadGithubAssets(
  binaryName: string,
  repo: string,
  tagName: string,
  assetNames: Record<
    'x64' | 'arm64',
    Partial<Record<SupportedPlatform, string>>
  >
) {
  const downloadPromises = Object.entries(assetNames).map(
    async ([arch, platformFilenameMap]) =>
      Promise.all(
        Object.entries(platformFilenameMap).map(([platform, filename]) => {
          if (!filename) return
          return downloadAsset(
            binaryName,
            repo,
            tagName,
            arch,
            platform as keyof typeof platformFilenameMap,
            filename
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
    RELEASE_TAGS['legendary'],
    {
      x64: {
        linux: 'legendary_linux_x86_64',
        darwin: 'legendary_macOS_x86_64',
        win32: 'legendary_windows_x86_64.exe'
      },
      arm64: {
        linux: 'legendary_linux_arm64',
        darwin: 'legendary_macOS_arm64'
      }
    }
  )
}

async function downloadGogdl() {
  return downloadGithubAssets(
    'gogdl',
    'Heroic-Games-Launcher/heroic-gogdl',
    RELEASE_TAGS['gogdl'],
    {
      x64: {
        linux: 'gogdl_linux_x86_64',
        darwin: 'gogdl_macOS_x86_64',
        win32: 'gogdl_windows_x86_64.exe'
      },
      arm64: {
        linux: 'gogdl_linux_arm64',
        darwin: 'gogdl_macOS_arm64'
      }
    }
  )
}

async function downloadNile() {
  return downloadGithubAssets('nile', 'imLinguin/nile', RELEASE_TAGS['nile'], {
    x64: {
      linux: 'nile_linux_x86_64',
      darwin: 'nile_macOS_x86_64',
      win32: 'nile_windows_x86_64.exe'
    },
    arm64: {
      linux: 'nile_linux_arm64',
      darwin: 'nile_macOS_arm64'
    }
  })
}

async function downloadComet() {
  return Promise.all([
    downloadGithubAssets(
      'GalaxyCommunication',
      'imLinguin/comet',
      RELEASE_TAGS['comet'],
      {
        x64: {
          win32: 'GalaxyCommunication-dummy.exe'
        },
        arm64: {}
      }
    ),
    downloadGithubAssets('comet', 'imLinguin/comet', RELEASE_TAGS['comet'], {
      x64: {
        linux: 'comet-x86_64-unknown-linux-gnu',
        darwin: 'comet-x86_64-apple-darwin',
        win32: 'comet-x86_64-pc-windows-msvc.exe'
      },
      arm64: {
        darwin: 'comet-aarch64-apple-darwin',
        linux: 'comet-aarch64-unknown-linux-gnu'
      }
    })
  ])
}

async function downloadEpicIntegration() {
  return downloadGithubAssets(
    'EpicGamesLauncher',
    'Etaash-mathamsetty/heroic-epic-integration',
    RELEASE_TAGS['epic-integration'],
    {
      x64: {
        win32: 'EpicGamesLauncher.exe'
      },
      arm64: {}
    }
  )
}

/**
 * Finds out which binaries need to be downloaded by comparing
 * `public/bin/.release_tags` to RELEASE_TAGS
 */
async function compareDownloadedTags(): Promise<DownloadedBinary[]> {
  const storedTagsText = await readFile(
    'public/bin/.release_tags',
    'utf-8'
  ).catch(() => '{}')
  let storedTagsParsed: Partial<Record<DownloadedBinary, string>>
  try {
    storedTagsParsed = JSON.parse(storedTagsText)
  } catch {
    return ['legendary', 'gogdl', 'nile', 'comet', 'epic-integration']
  }
  const binariesToDownload: DownloadedBinary[] = []
  for (const [runner, currentTag] of Object.entries(RELEASE_TAGS)) {
    if (storedTagsParsed[runner] !== currentTag)
      binariesToDownload.push(runner as keyof typeof RELEASE_TAGS)
  }
  return binariesToDownload
}

async function storeDownloadedTags() {
  await writeFile('public/bin/.release_tags', JSON.stringify(RELEASE_TAGS))
}

async function main() {
  const proxyUri = process.env['HTTPS_PROXY']
  if (proxyUri) {
    console.log(`Using proxy: ${proxyUri}`)
    const proxyAgent = new ProxyAgent(proxyUri)
    setGlobalDispatcher(proxyAgent)
  }

  if (!(await pathExists('public/bin'))) {
    console.error('public/bin not found, are you in the source root?')
    return
  }

  const binariesToDownload = await compareDownloadedTags()
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
  if (binariesToDownload.includes('comet'))
    promisesToAwait.push(downloadComet())
  if (binariesToDownload.includes('epic-integration'))
    promisesToAwait.push(downloadEpicIntegration())

  await Promise.all(promisesToAwait)

  await storeDownloadedTags()
}

void main()
