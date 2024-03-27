import { join } from 'path'
import {
  test,
  _electron as electron,
  type ElectronApplication
} from '@playwright/test'

const main_js = join(__dirname, '../build/main/main.js')

/**
 * Helper function to define a test requiring Heroic to be running
 * @param name The name of the test
 * @param func The test callback
 */
function electronTest(
  name: string,
  func: (app: ElectronApplication) => void | Promise<void>
) {
  test(name, async () => {
    const app = await electron.launch({
      args: [main_js]
    })
    await func(app)
    await app.close()
  })
}

export { electronTest }
