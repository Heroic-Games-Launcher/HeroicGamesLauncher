import { expect } from '@playwright/test'
import { electronTest } from './helpers'

electronTest('GOG affiliate links require consent', async (_app, page) => {
  await expect(page.locator('.Sidebar')).toBeVisible()
  await page.evaluate(async () => {
    localStorage.removeItem('gog-affiliate-prompt-shown')
    sessionStorage.setItem('last-url-gog', 'https://af.gog.com?as=1838482841')
    window.api.setSetting({
      appName: 'default',
      key: 'disableGOGAffiliate' as 'enableGOGAffiliate',
      value: false
    })
    await window.api.requestAppSettings()
    window.api.storeDelete('configStore', 'settings.enableGOGAffiliate')
  })
  await page.reload()
  await expect(page.locator('.Sidebar')).toBeVisible()
  expect(
    (await page.evaluate(() => window.api.requestAppSettings()))
      .disableDiscounts
  ).toBe(false)
  await page.evaluate(() => {
    window.location.hash = '#/store/gog'
  })

  const prompt = page.getByRole('dialog').filter({
    hasText: 'Support Heroic with your GOG purchases'
  })
  await expect(prompt).toBeVisible()
  await expect(prompt.getByLabel('Use GOG affiliate links')).not.toBeChecked()
  await expect(page.locator('webview')).toHaveAttribute(
    'src',
    'https://www.gog.com'
  )
  await prompt.getByRole('button', { name: 'close' }).click()
  await expect(prompt).not.toBeVisible()
  expect(
    (await page.evaluate(() => window.api.requestAppSettings()))
      .enableGOGAffiliate
  ).toBe(false)

  await page.evaluate(() => {
    window.location.hash = '#/'
  })
  await expect(page.locator('webview')).not.toBeAttached()
  await page.evaluate(() => {
    sessionStorage.setItem(
      'last-url-gog',
      'https://www.gog.com/en/?utm_source=adtraction'
    )
    window.location.hash = '#/store/gog'
  })
  await expect(page.locator('webview')).toHaveAttribute(
    'src',
    'https://www.gog.com'
  )
  await expect(prompt).not.toBeVisible()
})

electronTest('GOG affiliate consent can be enabled', async (app, page) => {
  await app.evaluate(({ session }) => {
    session
      .fromPartition('persist:gog')
      .webRequest.onBeforeRequest({ urls: ['*://*.gog.com/*'] }, (_, done) =>
        done({ cancel: true })
      )
  })
  await expect(page.locator('.Sidebar')).toBeVisible()
  await page.evaluate(async () => {
    localStorage.removeItem('gog-affiliate-prompt-shown')
    window.api.setSetting({
      appName: 'default',
      key: 'enableGOGAffiliate',
      value: false
    })
    await window.api.requestAppSettings()
  })
  await page.reload()
  await expect(page.locator('.Sidebar')).toBeVisible()
  await page.evaluate(() => {
    window.location.hash = '#/store/gog'
  })
  const prompt = page.getByRole('dialog').filter({
    hasText: 'Support Heroic with your GOG purchases'
  })
  await expect(prompt).toBeVisible()
  await page.locator('webview').evaluate(async (element) => {
    const webview = element as Electron.WebviewTag
    await webview.loadURL('data:text/html,first')
    await webview.loadURL('data:text/html,second')
  })
  await expect
    .poll(() =>
      page
        .locator('webview')
        .evaluate((element) => (element as Electron.WebviewTag).canGoBack())
    )
    .toBe(true)
  await page.locator('webview').evaluate((element) => {
    element.setAttribute('data-old-webview', 'true')
  })
  await prompt.locator('label.ToggleSwitch__track').click()
  await expect(prompt.getByLabel('Use GOG affiliate links')).toBeChecked()
  await expect(page.locator('webview[data-old-webview]')).not.toBeAttached()
  await expect(page.locator('webview')).toHaveAttribute(
    'src',
    /^(https:\/\/af\.gog\.com|https:\/\/www\.gog\.com\/.*utm_source=adtraction)/
  )
  await expect
    .poll(() =>
      page
        .locator('webview')
        .evaluate((element) => (element as Electron.WebviewTag).canGoBack())
    )
    .toBe(false)
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.api.requestAppSettings()))
          .enableGOGAffiliate
    )
    .toBe(true)
  await prompt.locator('label.ToggleSwitch__track').click()
  await expect(prompt.getByLabel('Use GOG affiliate links')).not.toBeChecked()
  await expect(page.locator('webview')).toHaveAttribute(
    'src',
    /^https:\/\/www\.gog\.com\/?$/
  )
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.api.requestAppSettings()))
          .enableGOGAffiliate
    )
    .toBe(false)
  await prompt.locator('label.ToggleSwitch__track').click()
  await expect(prompt.getByLabel('Use GOG affiliate links')).toBeChecked()
  await expect(prompt).toBeVisible()
  await prompt.getByRole('button', { name: 'close' }).click()
  await expect(prompt).not.toBeVisible()

  await page.evaluate(() => {
    window.location.hash = '#/settings/advanced'
  })
  const disabled = page.getByLabel('Disable GOG affiliate link')
  await expect(disabled).not.toBeChecked()
  await page
    .locator('label[for="disableGOGAffiliate"].ToggleSwitch__track')
    .click()
  await expect(disabled).toBeChecked()
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.api.requestAppSettings()))
          .enableGOGAffiliate
    )
    .toBe(false)

  await page.evaluate(() => {
    sessionStorage.setItem('last-url-gog', 'https://www.gog.com/en/game')
  })
  await page
    .locator('label[for="disableGOGAffiliate"].ToggleSwitch__track')
    .click()
  await expect(disabled).not.toBeChecked()
  expect(
    await page.evaluate(() => sessionStorage.getItem('last-url-gog'))
  ).toBeNull()
  await page.evaluate(() => {
    window.location.hash = '#/store/gog'
  })
  await expect(page.locator('webview')).toHaveAttribute(
    'src',
    /^(https:\/\/af\.gog\.com|https:\/\/www\.gog\.com\/.*utm_source=adtraction)/
  )
})
