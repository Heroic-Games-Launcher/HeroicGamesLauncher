import type { ElementHandle } from '@playwright/test'
import { expect, test } from '@playwright/test'
import type { WebviewTag } from 'electron'
import { electronTest } from './helpers'

const SECOND_URL = 'data:text/html,second page'
const WIKI_URL =
  'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki'

electronTest('webview', async (app) => {
  const page = await app.firstWindow()
  const urlInput = page.locator('.WebviewControls__urlInput')

  await test.step('goes back and forth inside webview and also to Heroic screens', async () => {
    // we have to do this or it fails, the icon also has the same text
    await page.locator('span').filter({ hasText: 'Documentation' }).click()

    await expect(urlInput).toBeVisible({ timeout: 15_000 })
    await expect(urlInput).toHaveAttribute('value', WIKI_URL)

    const webview = (await page.waitForSelector(
      'webview'
    )) as ElementHandle<WebviewTag>
    await expect
      .poll(() => webview.evaluate((el) => el.isLoading()), {
        timeout: 15_000
      })
      .toBe(false)
    await webview.evaluate((el, url) => (el.src = url), SECOND_URL)
    await expect(urlInput).toHaveAttribute('value', SECOND_URL)

    // go back to previous page in webview's history
    await expect
      .poll(() => webview.evaluate((el) => el.canGoBack()), { timeout: 10_000 })
      .toBe(true)
    const backButton = page.getByTitle('Go back')
    await backButton.click()
    await expect(urlInput).toHaveAttribute('value', WIKI_URL)

    // go forward again to the second page
    await page.getByTitle('Go forward').click()
    await expect(urlInput).toHaveAttribute('value', SECOND_URL)

    // simulate mouse back
    await page.dispatchEvent('body', 'mouseup', {
      button: 3,
      bubbles: true,
      cancelable: true
    })
    await expect(urlInput).toHaveAttribute('value', WIKI_URL)

    // simulate mouse forward
    await page.dispatchEvent('webview', 'mouseup', {
      button: 4,
      bubbles: true,
      cancelable: true
    })
    await expect(urlInput).toHaveAttribute('value', SECOND_URL)

    // it looks like we can't simulate mouse buttons INSIDE the webview to also test those

    // go back to the documentation page and then the library
    await page.getByTitle('Go back').click()
    await page.getByTitle('Go back').click()
    await expect(page.getByText('All Games')).toBeVisible()
  })
})
