import { expect, test } from '@playwright/test'
import { electronTest } from './helpers'

electronTest('Settings', async (app, page) => {
  // stub `legendary --version`
  await app.evaluate(({ ipcMain }) => {
    ipcMain.emit('setLegendaryCommandStub', [
      {
        commandParts: ['--version'],
        stdout: 'legendary version "1.2.3", codename "Some Name"'
      }
    ])
  })

  // stub `gogdl --version`
  await app.evaluate(({ ipcMain }) => {
    ipcMain.emit('setGogdlCommandStub', [
      {
        commandParts: ['--version'],
        stdout: '2.3.4'
      }
    ])
  })

  // stub `nile --version`
  await app.evaluate(({ ipcMain }) => {
    ipcMain.emit('setNileCommandStub', [
      {
        commandParts: ['--version'],
        stdout: '1.1.1 JoJo'
      }
    ])
  })

  await test.step('opens the Settings screen', async () => {
    await page
      .locator('.Sidebar')
      .locator('.Sidebar__item', { hasText: 'Settings' })
      .click()
    await expect(page.getByRole('heading', { name: 'General' })).toBeVisible()
  })

  await test.step('searches settings by name', async () => {
    const search = page.getByRole('combobox', { name: 'Search settings' })

    await search.fill('discord')
    await expect(
      page.getByRole('option', { name: /Discord rich presence/ })
    ).toBeVisible()
    await search.press('Enter')
    await expect(page.getByLabel('Enable Discord rich presence')).toBeFocused()
  })

  await test.step('shows the Runners settings', async () => {
    await page.getByRole('link', { name: 'Runners' }).click()
  })

  await test.step('shows alternative binaries inputs', async () => {
    await expect(
      page.getByLabel('Choose an Alternative Legendary Binary')
    ).toBeVisible()
    await expect(
      page.getByLabel('Choose an Alternative GOGDL Binary to use')
    ).toBeVisible()
    await expect(
      page.getByLabel('Choose an Alternative Nile Binary')
    ).toBeVisible()
  })

  await test.step('shows the binaries versions from the binaries', async () => {
    await expect(
      page.getByText('Legendary Version: 1.2.3 Some Name')
    ).toBeVisible()
    await expect(page.getByText('GOGDL Version: 2.3.4')).toBeVisible()
    await expect(page.getByText('Nile Version: 1.1.1 JoJo')).toBeVisible()
  })

  await test.step('shows the default experimental features', async () => {
    await page.getByRole('link', { name: 'Advanced' }).click()
    await expect(page.getByLabel('Help component')).not.toBeChecked()
  })
})
