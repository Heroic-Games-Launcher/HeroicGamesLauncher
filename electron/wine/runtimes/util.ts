import axios from 'axios'
import { spawn } from 'child_process'
import { mkdirSync, writeFileSync } from 'graceful-fs'
import { logError, LogPrefix } from './../../logger/logger'

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
  const [, , author, repo, , , tag, assetName] = splitUrl
  const releaseData = (
    await axios.get(
      `https://api.github.com/repos/${author}/${repo}/releases/tags/${tag}`
    )
  ).data
  const assets: Array<GithubAssetMetadata> = releaseData.assets
  return assets.find((asset) => {
    if (asset.name === assetName) {
      return true
    }
  })
}

async function downloadFile(url: string, filePath: string) {
  const data = (await axios.get(url)).data
  writeFileSync(filePath, data)
}

async function extractTarFile(
  filePath: string,
  contentType: string,
  extractedPath?: string
) {
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
      logError(
        ['extractTarFile: Unrecognized content_type', contentType],
        LogPrefix.Runtime
      )
      throw new Error('Unrecognized content_type ' + contentType)
  }
  return new Promise((res, rej) => {
    const child = spawn('tar', [
      '--directory',
      extractedPath,
      '--strip-components',
      '1',
      tarflags,
      filePath
    ])
    child.on('close', res)
    child.on('error', rej)
  })
}

export { getAssetDataFromDownload, downloadFile, extractTarFile }
