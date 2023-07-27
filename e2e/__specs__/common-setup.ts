import '../../src/common/types/proxy-types'
import { test } from '@playwright/test'
import { findLatestBuild, parseElectronApp } from 'electron-playwright-helpers'
import { ElectronApplication, _electron as electron } from 'playwright'

export let electronApp: ElectronApplication

export default function setup(): void {
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
      .stderr?.on('data', (error) =>
        console.log(`main process stderr: ${error}`)
      )

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
}
