import { expect, test } from '@playwright/test'
import { electronTest } from './helpers'

electronTest('Settings', async (app, page) => {
  // stub `legendary --version`
  await app.evaluate(({ ipcMain }) => {
    ipcMain.emit('setRunLegendaryCommandStub', [
      {
        command: '--version',
        stdout: 'legendary version "1.2.3", codename "Some Name"'
      }
    ])
  })

  await test.step('shows the Advanced settings', async () => {
    await page.getByTestId('settings').click()
    page.getByText('Global Settings')
    await page.getByText('Advanced').click()
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

  await test.step('shows the legendary version from the legendary command', async () => {
    expect(page.getByText('Legendary Version: 1.2.3 Some Name')).toBeVisible({
      timeout: 10000
    })
  })

  // TODO: add stubs for gogdl and nile
  // expect(page.getByText('GOGDL Version: 1.0.0')).toBeVisible()
  // expect(page.getByText('Nile Version: 1.0.0 Jonathan Joestar')).toBeVisible()

  await test.step('shows the default experimental features', async () => {
    await expect(page.getByLabel('New design')).not.toBeChecked()
    await expect(page.getByLabel('Help component')).not.toBeChecked()
    await expect(
      page.getByLabel('Apply known fixes automatically')
    ).toBeChecked()
  })
})
