import { expect, test } from '@playwright/test'
import { electronTest } from './helpers'

const WIKI_URL =
  'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki'
const GOOGLE_URL = 'https://www.google.com/'

electronTest('webview', async (app) => {
  const page = await app.firstWindow()
  const urlInput = page.locator('.WebviewControls__urlInput')

  await test.step('goes back and forth inside webview and also to Heroic screens', async () => {
    // we have to do this or it fails, the icon also has the same text
    await page.locator('span').filter({ hasText: 'Documentation' }).click()

    // wait for the wiki to load in the webview
    await expect(urlInput).toHaveAttribute('value', WIKI_URL)

    // use evaluate + loadURL so Playwright properly awaits the navigation
    // promise instead of racing ahead on a src change
    const webview = await page.$('webview')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
    await page.evaluate(({ el, url }) => el.loadURL(url), {
      el: webview,
      url: GOOGLE_URL
    })
    await expect(urlInput).toHaveAttribute('value', GOOGLE_URL)

    // go back to previous page in webview's history
    await page.getByTitle('Go back').click()
    await expect(urlInput).toHaveAttribute('value', WIKI_URL)

    // go forward again to google.com
    await page.getByTitle('Go forward').click()
    await expect(urlInput).toHaveAttribute('value', GOOGLE_URL)

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
    await expect(urlInput).toHaveAttribute('value', GOOGLE_URL)

    // it looks like we can't simulate mouse buttons INSIDE the webview to also test those

    // go back twice to end up in the library
    await page.getByTitle('Go back').click()
    await page.getByTitle('Go back').click()
    await expect(page.getByText('All Games')).toBeVisible()
  })
})
