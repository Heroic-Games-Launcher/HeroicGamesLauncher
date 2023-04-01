import { expect, test } from '@playwright/test'
import {
  findLatestBuild,
  parseElectronApp,
  ipcMainInvokeHandler
} from 'electron-playwright-helpers'
import { ElectronApplication, Page, _electron as electron } from 'playwright'

let electronApp: ElectronApplication

test.beforeAll(async () => {
  process.env.CI = 'e2e'
  if (process.env.testPackaged) {
    console.log('Testing packaged build')
    // must run yarn dist:<platform> prior to test
    const latestBuild = findLatestBuild('dist')
    const appInfo = parseElectronApp(latestBuild)
    console.log(
      'app info main = ',
      appInfo.main,
      '\n app info exe = ',
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

  const legendaryVersion = await page.evaluate(async () => {
    return window.api.getHeroicVersion()
  })
  console.log('Legendary Version: ', legendaryVersion)

  const gogdlVersion = await page.evaluate(async () => {
    return window.api.getGogdlVersion()
  })
  console.log('Legendary Version: ', gogdlVersion)
})

test('test ipcMainInvokeHandler', async () => {
  const heroicVersion = await ipcMainInvokeHandler(
    electronApp,
    'checkGameUpdates'
  )
  console.log('Games that need updating: ', heroicVersion)
})
