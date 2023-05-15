import { DiskSpaceData } from './../../common/types'
import { expect, test } from '@playwright/test'
import {
  findLatestBuild,
  parseElectronApp,
  ipcMainInvokeHandler
} from 'electron-playwright-helpers'
import { ElectronApplication, Page, _electron as electron } from 'playwright'
import { compareVersions } from 'compare-versions'
import { platform as platformOS } from 'os'

let electronApp: ElectronApplication

test.beforeAll(async () => {
  test.setTimeout(120000)
  process.env.CI = 'e2e'
  if (process.env.TEST_PACKAGED === 'true') {
    console.log('Testing packaged build')
    // must run yarn dist:<platform> prior to test
    const latestBuild = findLatestBuild('dist')
    const appInfo = parseElectronApp(latestBuild)
    console.log(
      'app info main = ',
      appInfo.main,
      '\napp info exe = ',
      appInfo.executable
    )

    electronApp = await electron.launch({
      args: [appInfo.main],
      executablePath: appInfo.executable
    })
  } else {
    console.log('Testing unpackaged build')
    electronApp = await electron.launch({
      args: ['.', '--no-sandbox']
    })
  }

  // this pipes the main process std out to test std out
  electronApp
    .process()
    .stdout?.on('data', (data) => console.log(`main process stdout: ${data}`))
  electronApp
    .process()
    .stderr?.on('data', (error) => console.log(`main process stderr: ${error}`))

  electronApp.on('window', async (page) => {
    const title = await page.title()
    console.log('Window loaded: ', title)
    const filename = page.url()?.split('/').pop()
    console.log(`Window opened: ${filename}`)

    // capture errors
    page.on('pageerror', (error) => {
      console.error(error)
    })
    // capture console messages
    page.on('console', (msg) => {
      console.log(msg.text())
    })
  })
})

test.afterAll(async () => {
  await electronApp.close()
})

let page: Page

test('renders the first page', async () => {
  page = await electronApp.firstWindow()
  const title = await page.title()
  expect(title).toBe('Heroic Games Launcher')
})

test('gets heroic, legendary, and gog versions', async () => {
  const heroicVersion = await page.evaluate(async () => {
    return window.api.getHeroicVersion()
  })
  console.log('Heroic Version: ', heroicVersion)
  // check that heroic version is newer or equal to 2.6.3
  expect(compareVersions(heroicVersion, '2.6.3')).toBeGreaterThanOrEqual(0)

  let legendaryVersion = await page.evaluate(async () => {
    return window.api.getLegendaryVersion()
  })
  legendaryVersion = legendaryVersion.trim().split(' ')[0]
  console.log('Legendary Version: ', legendaryVersion)
  expect(compareVersions(legendaryVersion, '0.20.32')).toBeGreaterThanOrEqual(0)

  const gogdlVersion = await page.evaluate(async () => {
    return window.api.getGogdlVersion()
  })
  console.log('Gogdl Version: ', gogdlVersion)
  expect(compareVersions(gogdlVersion, '0.7.1')).toBeGreaterThanOrEqual(0)
})

test('test ipcMainInvokeHandler', async () => {
  const platform: DiskSpaceData = (await ipcMainInvokeHandler(
    electronApp,
    'getPlatform'
  )) as DiskSpaceData
  console.log('Platform: ', platform)
  expect(platform).toEqual(platformOS())
})
