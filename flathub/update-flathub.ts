import * as fs from 'fs'
import * as crypto from 'crypto'
import * as os from 'os'
import * as child_process from 'child_process'
import axios from 'axios'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'

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
  const repoOrgName = 'Heroic-Games-Launcher'
  const repoName = repoOrgName + '/HeroicGamesLauncher'

  // update url in com.heroicgameslauncher.hgl.yml
  console.log('updating url in com.heroicgameslauncher.hgl.yml')
  const ymlFilePath =
    './com.heroicgameslauncher.hgl/com.heroicgameslauncher.hgl.yml'
  let heroicYml = fs.readFileSync(ymlFilePath).toString()

  // Get the latest release information
  console.log('Fetching latest release info')
  const { data } = await axios.get<GitHubRelease>(
    `https://api.github.com/repos/${repoName}/releases/latest`
  )

  // Use x86_64 only for now
  const architecture = 'x86_64'

  // Find the AppImage asset
  const appimage = data.assets.find((asset) =>
    asset.browser_download_url.includes('AppImage')
  )

  if (!appimage) {
    throw new Error('Could not find AppImage asset in latest release')
  }

  console.log(`Using AppImage: ${appimage.browser_download_url}`)

  // Construct the release string with x86_64 architecture
  const releaseString = `https://github.com/${repoName}/releases/download/${
    process.env.RELEASE_VERSION
  }/Heroic-${process.env.RELEASE_VERSION?.substring(
    1
  )}-linux-${architecture}.AppImage`

  // Updated regex to match any architecture pattern in the URL
  heroicYml = heroicYml.replace(
    /https:\/\/github.com\/Heroic-Games-Launcher\/HeroicGamesLauncher\/releases\/download\/v.*..*..*\/Heroic-.*..*..*(-linux-[a-z0-9_]+)?.AppImage/,
    releaseString
  )

  // update hash in com.heroicgameslauncher.hgl.yml from latest .AppImage release
  console.log('updating hash in com.heroicgameslauncher.hgl.yml')

  const outputFile = `${os.tmpdir()}/Heroic.AppImage`
  child_process.spawnSync('curl', [
    '-L',
    appimage.browser_download_url,
    '-o',
    outputFile,
    '--create-dirs'
  ])
  const outputContent = fs.readFileSync(outputFile)
  const hashSum = crypto.createHash('sha512')
  hashSum.update(outputContent)
  const sha512 = hashSum.digest('hex')
  fs.rmSync(outputFile)

  heroicYml = heroicYml.replace(/sha512: [0-9, a-f]{128}/, `sha512: ${sha512}`)

  fs.writeFileSync(ymlFilePath, heroicYml)

  // update release version and date on xml tag in com.heroicgameslauncher.hgl.metainfo.xml
  console.log(
    'updating release version and date on xml tag in com.heroicgameslauncher.hgl.metainfo.xml'
  )
  const xmlFilePath =
    './com.heroicgameslauncher.hgl/com.heroicgameslauncher.hgl.metainfo.xml'
  let heroicXml = fs.readFileSync(xmlFilePath).toString()
  const date = new Date()
  const isoDate = date.toISOString().slice(0, 10)

  heroicXml = heroicXml.replace(
    /release version="v.*..*..*" date="[0-9]{4}-[0-9]{2}-[0-9]{2}"/,
    `release version="${process.env.RELEASE_VERSION}" date="${isoDate}"`
  )

  fs.writeFileSync(xmlFilePath, heroicXml)
  console.log(
    'Finished updating flathub release! Be sure to update release notes manually before merging.'
  )

  // update release notes
  console.log('setting default remote repo for gh cli')
  const setDefaultResult = child_process.spawnSync('gh', [
    'repo',
    'set-default',
    repoName
  ])
  console.log('setDefaultResult stdout = ', setDefaultResult.stdout?.toString())
  console.log(
    'setDefaultResult stderr = ',
    setDefaultResult.stderr?.toString(),
    ' error: ',
    setDefaultResult?.error
  )

  const releaseNotesResult = child_process.spawnSync('gh', [
    'release',
    'view',
    process.env.RELEASE_VERSION ?? 'undefined',
    '--json',
    'body'
  ])
  const releaseNotesStdOut = releaseNotesResult.stdout?.toString()
  console.log('releaseListResult stdout = ', releaseNotesStdOut)
  console.log(
    'releaseListResult stderr = ',
    releaseNotesResult.stderr?.toString()
  )

  const releaseNotesJson = JSON.parse(releaseNotesStdOut)
  const releaseNotesComponents: string[] = releaseNotesJson.body.split('\n')

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
    if (releaseComponent_i.includes('http')) continue

    const li = releaseComponent_i
      .replace(/\n/g, '')
      .replace(/\r/g, '')
      .replace(/\t/g, '')
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
  const releasesTag = componentsTag.find((val) => val.releases !== undefined)

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
