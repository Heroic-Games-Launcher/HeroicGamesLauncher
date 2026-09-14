import * as fs from 'fs'
import * as crypto from 'crypto'
import axios from 'axios'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { selectAppImageAsset } from './release-assets'

// Define interface for GitHub API Release response
interface GitHubReleaseAsset {
  name: string
  browser_download_url: string
  size: number
  id: number
  content_type: string
}

interface GitHubRelease {
  tag_name: string
  name: string
  body: string
  assets: GitHubReleaseAsset[]
  published_at: string
  html_url: string
}

async function main() {
  console.log('tag name: ', process.env.RELEASE_VERSION)
  console.log('is prerelease: ', process.env.IS_PRERELEASE)
  const repoOrgName = 'Heroic-Games-Launcher'
  const repoName = repoOrgName + '/HeroicGamesLauncher'
  const packagingDirectory = process.argv[2] || './com.heroicgameslauncher.hgl'

  // update url in com.heroicgameslauncher.hgl.yml
  console.log('updating url in com.heroicgameslauncher.hgl.yml')
  const ymlFilePath = `${packagingDirectory}/com.heroicgameslauncher.hgl.yml`
  let heroicYml = fs.readFileSync(ymlFilePath).toString()

  // Use the requested release so its URLs, checksums and metadata stay aligned.
  console.log('Fetching release info')
  let releaseData: GitHubRelease

  if (process.env.RELEASE_VERSION) {
    const { data } = await axios.get<GitHubRelease>(
      `https://api.github.com/repos/${repoName}/releases/tags/${encodeURIComponent(process.env.RELEASE_VERSION)}`
    )
    releaseData = data
  } else {
    // Fall back to the latest release when no tag was supplied.
    const { data } = await axios.get<GitHubRelease>(
      `https://api.github.com/repos/${repoName}/releases/latest`
    )
    releaseData = data
  }

  const downloadChecksum = async (url: string) => {
    const { data } = await axios.get<Buffer>(url, {
      responseType: 'arraybuffer'
    })
    return crypto.createHash('sha512').update(data).digest('hex')
  }

  if (heroicYml.includes('heroic-sources.json')) {
    // The shared manifest uses tarballs so extraction works on either host.
    const assets = [
      ['x86_64', 'x64'],
      ['aarch64', 'arm64']
    ].map(([flatpakArch, assetArch]) => {
      const asset = releaseData.assets.find((asset) =>
        asset.browser_download_url.endsWith(`-linux-${assetArch}.tar.xz`)
      )
      if (!asset)
        throw new Error(`No Linux ${assetArch} tarball in this release`)
      return { flatpakArch, url: asset.browser_download_url }
    })
    const sources = await Promise.all(
      assets.map(async ({ flatpakArch, url }) => ({
        type: 'archive',
        url,
        sha512: await downloadChecksum(url),
        dest: 'heroic',
        'only-arches': [flatpakArch]
      }))
    )
    // Resolve and verify both downloads before changing the pinned sources.
    fs.writeFileSync(
      `${packagingDirectory}/heroic-sources.json`,
      JSON.stringify(sources, null, 2) + '\n'
    )
  } else {
    // Keep compatibility with the existing single-architecture manifest.
    const appimage = selectAppImageAsset(releaseData.assets, 'x86_64')
    console.log(`Using AppImage: ${appimage.browser_download_url}`)
    const sha512 = await downloadChecksum(appimage.browser_download_url)
    heroicYml = heroicYml.replace(
      /https:\/\/github.com\/Heroic-Games-Launcher\/HeroicGamesLauncher\/releases\/download\/v.*..*..*\/Heroic-.*..*..*(-linux-[a-z0-9_]+)?.AppImage/,
      appimage.browser_download_url
    )
    heroicYml = heroicYml.replace(
      /sha512: [0-9, a-f]{128}/,
      `sha512: ${sha512}`
    )
    fs.writeFileSync(ymlFilePath, heroicYml)
  }

  // update release version and date on xml tag in com.heroicgameslauncher.hgl.metainfo.xml
  console.log(
    'updating release version and date on xml tag in com.heroicgameslauncher.hgl.metainfo.xml'
  )
  const xmlFilePath = `${packagingDirectory}/com.heroicgameslauncher.hgl.metainfo.xml`
  let heroicXml = fs.readFileSync(xmlFilePath).toString()
  const isoDate = releaseData.published_at.split('T')[0]

  heroicXml = heroicXml.replace(
    /release version="v.*..*..*" date="[0-9]{4}-[0-9]{2}-[0-9]{2}"/,
    `release version="${releaseData.tag_name}" date="${isoDate}"`
  )

  fs.writeFileSync(xmlFilePath, heroicXml)
  console.log(
    'Finished updating flathub release! Be sure to update release notes manually before merging.'
  )

  const releaseNotesComponents = (releaseData.body || '').split('\n')

  // XML Modification with fast-xml-parser
  heroicXml = fs.readFileSync(xmlFilePath).toString()

  const parserOptions = {
    ignoreAttributes: false,
    preserveOrder: true,
    format: true, // Enable formatting
    indentBy: '  ' // Use two spaces for indentation
  }

  const parser = new XMLParser(parserOptions)

  const heroicXmlJson = parser.parse(heroicXml)

  const builder = new XMLBuilder(parserOptions)

  const releaseNotesElements: Record<string, Array<Record<string, string>>>[] =
    [] // An array to hold generated <li> elements

  for (const [i, releaseComponent_i] of releaseNotesComponents.entries()) {
    if (i === 0) continue
    if (!releaseComponent_i.startsWith('*')) continue

    // Remove URLs and "@username" from the release note text
    const li = releaseComponent_i
      .replace(/\n/g, '')
      .replace(/\r/g, '')
      .replace(/\t/g, '')
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/by\s+@[\w-]+/gi, '') // Remove "by @username"
      .slice(1)
      .trim()

    // Creating the <li> element (compatible with fast-xml-parser)
    const releaseNoteElement = {
      li: [
        { '#text': li } // Directly set the text within the <li> element
      ]
    }

    releaseNotesElements.push(releaseNoteElement)
  }

  const componentsTag = heroicXmlJson[1].component
  // Locate the 'releases' element within the 'componentsTag'
  const releasesTag = componentsTag.find(
    (val: { releases?: unknown }) => val.releases !== undefined
  )

  // Proceed to find the <ul> element as before
  const releaseListTag = releasesTag?.releases[0].release[0].description[1]

  if (releaseListTag === undefined) {
    throw new Error('releaseListTag ul undefined')
  }

  releaseListTag.ul = [...releaseNotesElements] // Set the <ul> element to the generated <li> elements

  console.log('new releaseListTag = ', JSON.stringify(releaseListTag, null, 2))

  const updatedHeroicXml = builder.build(heroicXmlJson)

  console.log('updatedheroicXml = ', updatedHeroicXml)

  fs.writeFileSync(xmlFilePath, updatedHeroicXml)

  console.log(
    'Finished updating flathub release! Please review and merge the flathub repo PR manually.'
  )
}

main()
