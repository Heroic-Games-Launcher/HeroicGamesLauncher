import axios from 'axios'
import { spawn } from 'child_process'
import { existsSync, mkdirSync, writeFile } from 'graceful-fs'

interface GithubAssetMetadata {
  url: string
  id: number
  node_id: string
  name: string
  label: string
  content_type: string
  state: string
  size: number
  download_count: number
  created_at: string
  updated_at: string
  browser_download_url: string
}

/**
 * Takes a GitHub download URL (https://www.github.com/AUTHOR/REPO/releases/download/TAGNAME/ASSET) and returns relevant asset metadata
 * @param url
 * @returns
 */
async function getAssetDataFromDownload(
  url: string
): Promise<GithubAssetMetadata> {
  const splitUrl = url.split('/').filter(Boolean)
  if (!splitUrl || splitUrl.length < 8) {
    throw new Error('Invalid URL provided')
  }

  const [, , author, repo, , , tag, assetName] = splitUrl
  const response = await axios
    .get(`https://api.github.com/repos/${author}/${repo}/releases/tags/${tag}`)
    .catch((error) => {
      throw new Error(`Failed to access GitHub API: ${error.toJSON()}`)
    })

  if (response.status !== 200) {
    throw new Error(`Got HTTP error code ${response.status}`)
  }
  if (!response.data.assets) {
    throw new Error('Asset metadata could not be found')
  }

  const assets: Array<GithubAssetMetadata> = response.data.assets
  const asset = assets.find((asset) => asset.name === assetName)
  if (!asset) {
    throw new Error(`Asset with name ${assetName} was not found`)
  }
  return asset
}

async function downloadFile(url: string, filePath: string) {
  const response = await axios
    .get(url, { responseType: 'arraybuffer' })
    .catch((error) => {
      throw new Error(`Failed to download ${url}: ${error.toJSON()}`)
    })
  if (response.status !== 200) {
    throw new Error(
      `Failed to download ${url}: HTTP error code ${response.status}`
    )
  }
  return new Promise<void>((res, rej) => {
    writeFile(filePath, response.data, (err) => {
      if (err) {
        rej(new Error(`Failed to save downloaded data to file: ${err.stack}`))
      }
      res()
    })
  })
}

async function extractTarFile(
  filePath: string,
  contentType: string,
  options?: { extractedPath?: string; strip?: number }
) {
  if (!existsSync(filePath)) {
    throw new Error('Specified file does not exist: ' + filePath)
  }

  let extractedPath = options?.extractedPath ?? ''
  if (!extractedPath) {
    const splitPath = filePath.split('.tar')
    splitPath.pop()
    extractedPath = splitPath.join('.tar')
  }
  mkdirSync(extractedPath, { recursive: true })
  let tarflags = ''
  switch (contentType) {
    case 'application/x-xz':
      tarflags = '-Jxf'
      break
    default:
      throw new Error('Unrecognized content_type: ' + contentType)
  }

  const strip = options?.strip
  return new Promise((res, rej) => {
    const child = spawn('tar', [
      '--directory',
      extractedPath,
      ...(strip ? ['--strip-components', `${strip}`] : []),
      tarflags,
      filePath
    ])
    child.on('close', res)
    child.on('error', rej)
  })
}

export { getAssetDataFromDownload, downloadFile, extractTarFile }
