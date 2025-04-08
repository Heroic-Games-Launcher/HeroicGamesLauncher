import { supportedLanguages } from '../src/common/languages'
import { test } from '@playwright/test'
import { electronTest } from './helpers'

// ensure heroic always render correctly for all languages when library is empty
electronTest('Settings', async (app, page) => {
  for (const lang of supportedLanguages) {
    await test.step(`renders ${lang} with no errors`, async () => {
      // use selectors cause text will change for each language
      await page.locator('.Sidebar a[href="#/settings/general"]').click()

      await page.locator('.settingsWrapper').isVisible()
      await page.selectOption('#languageSelector', lang)

      await page.locator('.Sidebar a[href="#/"]').click()

      await page.locator('.Header').isVisible()
      await page.locator('.listing').isVisible()
    })
  }

  // set english again to not break the rest of the tests
  await page.locator('.Sidebar a[href="#/settings/general"]').click()
  await page.locator('.settingsWrapper').isVisible()
  await page.selectOption('#languageSelector', 'en')
})
