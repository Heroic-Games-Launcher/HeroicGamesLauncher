import { join } from 'path'
import {
  test,
  _electron as electron,
  ElectronApplication,
  Page
} from '@playwright/test'

const main_js = join(__dirname, '../build/main/main.js')

/**
 * Helper function to define a test requiring Heroic to be running
 * @param name The name of the test
 * @param func The test callback
 */
function electronTest(
  name: string,
  func: (app: ElectronApplication, page: Page) => void | Promise<void>
) {
  test(name, async () => {
    const electronApp = await electron.launch({
      args: [main_js]
    })

    // uncomment these lines to print electron's output
    // electronApp
    //   .process()!
    //   .stdout?.on('data', (data) => console.log(`stdout: ${data}`))
    // electronApp
    //   .process()!
    //   .stderr?.on('data', (error) => console.log(`stderr: ${error}`))

    const page = await electronApp.firstWindow()

    // Wait until the renderer has mounted and navigated to the app shell.
    // `firstWindow` can resolve while the initial navigation is still in
    // flight, which destroys the execution context and makes `page.evaluate`
    // fail with "Execution context was destroyed".
    await page.locator('.Sidebar').waitFor({ state: 'visible' })

    await func(electronApp, page)

    await resetAllStubs(electronApp)

    await electronApp.close()
  })
}

async function resetAllStubs(app: ElectronApplication) {
  await resetLegendaryCommandStub(app)
  await resetGogdlCommandStub(app)
  await resetNileCommandStub(app)
}

async function resetLegendaryCommandStub(app: ElectronApplication) {
  await app.evaluate(({ ipcMain }) => {
    ipcMain.emit('resetLegendaryCommandStub')
  })
}

async function resetGogdlCommandStub(app: ElectronApplication) {
  await app.evaluate(({ ipcMain }) => {
    ipcMain.emit('resetGogdlCommandStub')
  })
}

async function resetNileCommandStub(app: ElectronApplication) {
  await app.evaluate(({ ipcMain }) => {
    ipcMain.emit('resetNileCommandStub')
  })
}

export {
  electronTest,
  resetLegendaryCommandStub,
  resetGogdlCommandStub,
  resetNileCommandStub
}
