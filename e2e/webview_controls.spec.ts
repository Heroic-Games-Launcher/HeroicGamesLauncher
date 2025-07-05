import { expect, test } from '@playwright/test'
import { electronTest } from './helpers'
import { WebviewTag } from 'electron'

electronTest('webview', async (app) => {
  const page = await app.firstWindow()

  await test.step('goes back and forth inside webview and also to Heroic screens', async () => {
    // we have to do this or it fails, the icon also has the same text
    await page.locator('span').filter({ hasText: 'Documentation' }).click()

    // we have to wait a bit for the webview to properly load these urls
    // it's not great to force a sleep, but without these it's too flaky
    await page.waitForTimeout(600)

    await expect(page.locator('.WebviewControls__urlInput')).toHaveAttribute(
      'value',
      'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki'
    )
    await page.waitForTimeout(600)

    // we have to force a src change since we can't really click something reliably
    // inside the webview programatically
    await page.$eval(
      'webview',
      (el: WebviewTag) => (el.src = 'https://www.google.com/')
    )
    await page.waitForTimeout(600)

    await expect(page.locator('.WebviewControls__urlInput')).toHaveAttribute(
      'value',
      'https://www.google.com/'
    )

    // go back to previous page in webview's history
    await page.getByTitle('Go back').click()
    await expect(page.locator('.WebviewControls__urlInput')).toHaveAttribute(
      'value',
      'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki'
    )

    // go forward again to google.com
    await page.getByTitle('Go forward').click()
    await expect(page.locator('.WebviewControls__urlInput')).toHaveAttribute(
      'value',
      'https://www.google.com/'
    )
    await page.waitForTimeout(600)

    // simulate mouse back
    await page.dispatchEvent('body', 'mouseup', {
      button: 3,
      bubbles: true,
      cancelable: true
    })
    await expect(page.locator('.WebviewControls__urlInput')).toHaveAttribute(
      'value',
      'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki'
    )
    await page.waitForTimeout(600)

    // simulate mouse forward
    await page.dispatchEvent('webview', 'mouseup', {
      button: 4,
      bubbles: true,
      cancelable: true
    })
    await expect(page.locator('.WebviewControls__urlInput')).toHaveAttribute(
      'value',
      'https://www.google.com/'
    )
    await page.waitForTimeout(600)

    // it looks like we can't simulate mouse buttons INSIDE the webview to also test those

    // go back twice to end up in the library
    await page.getByTitle('Go back').click()
    await page.getByTitle('Go back').click()
    await expect(page.getByText('All Games')).toBeVisible()
  })
})
