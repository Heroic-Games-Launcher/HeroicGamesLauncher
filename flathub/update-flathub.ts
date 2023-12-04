import * as fs from 'fs'
import * as crypto from 'crypto'
import * as os from 'os'
import * as child_process from 'child_process'
import axios from 'axios'
import * as convert from 'xml-js'
import { Element } from 'xml-js'

async function main() {
  console.log('tag name: ', process.env.RELEASE_VERSION)
  const repoOrgName = 'Heroic-Games-Launcher'
  const repoName = repoOrgName + '/HeroicGamesLauncher'

  // update url in com.heroicgameslauncher.hgl.yml
  console.log('updating url in com.heroicgameslauncher.hgl.yml')
  const ymlFilePath =
    './com.heroicgameslauncher.hgl/com.heroicgameslauncher.hgl.yml'
  let hpYml = fs.readFileSync(ymlFilePath).toString()

  const releaseString = `https://github.com/${repoName}/releases/download/${
    process.env.RELEASE_VERSION
  }/Heroic-${process.env.RELEASE_VERSION?.substring(1)}.AppImage`
  hpYml = hpYml.replace(
    /https:\/\/github.com\/Heroic-Games-Launcher\/HeroicGamesLauncher\/releases\/download\/v.*..*..*\/Heroic-.*..*..*.AppImage/,
    releaseString
  )

  // update hash in com.heroicgameslauncher.hgl.yml from latest .AppImage release
  console.log('updating hash in com.heroicgameslauncher.hgl.yml')
  const { data } = await axios.get(
    `https://api.github.com/repos/${repoName}/releases/latest`
  )
  const appimage = data.assets.find((asset) =>
    asset.browser_download_url.includes('AppImage')
  )
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

  hpYml = hpYml.replace(/sha512: [0-9, a-f]{128}/, `sha512: ${sha512}`)

  fs.writeFileSync(ymlFilePath, hpYml)

  // update release version and date on xml tag in com.heroicgameslauncher.hgl.metainfo.xml
  console.log(
    'updating release version and date on xml tag in com.heroicgameslauncher.hgl.metainfo.xml'
  )
  const xmlFilePath =
    './com.heroicgameslauncher.hgl/com.heroicgameslauncher.hgl.metainfo.xml'
  let hpXml = fs.readFileSync(xmlFilePath).toString()
  const date = new Date()
  const isoDate = date.toISOString().slice(0, 10)

  hpXml = hpXml.replace(
    /release version="v.*..*..*" date="[0-9]{4}-[0-9]{2}-[0-9]{2}"/,
    `release version="${process.env.RELEASE_VERSION}" date="${isoDate}"`
  )

  fs.writeFileSync(xmlFilePath, hpXml)
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
  const releaseNotesComponents = releaseNotesJson.body.split('\n')

  const hpXmlJson = convert.xml2js(hpXml, { compact: false }) as Element
  const releaseNotesElements: Element[] = []

  for (const [i, releaseComponent_i] of releaseNotesComponents.entries()) {
    //update metainfo hpXml
    if (i === 0) continue
    if (!releaseComponent_i.startsWith('*')) continue
    if (releaseComponent_i.includes('http')) continue
    const releaseNoteElement: Element = {
      type: 'element',
      name: 'li',
      elements: [
        {
          type: 'text',
          text: releaseComponent_i.slice(1) //remove the asterisk
        }
      ]
    }
    releaseNotesElements.push(releaseNoteElement)
  }

  const componentsTag = hpXmlJson.elements?.[0]
  const releasesTag = componentsTag?.elements?.find(
    (val) => val.name === 'releases'
  ) //.releases.release.description.ul =
  const releaseListTag =
    releasesTag?.elements?.[0].elements?.[0].elements?.find(
      (val) => val.name === 'ul'
    )
  if (releaseListTag === undefined) {
    throw 'releaseListTag ul undefined'
  }
  releaseListTag.elements = releaseNotesElements
  hpXml = convert.js2xml(hpXmlJson)
  fs.writeFileSync(xmlFilePath, hpXml)

  console.log(
    'Finished updating flathub release! Please review and merge the flathub repo PR manually.'
  )
}

main()
