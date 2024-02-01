import { expect, test } from '@playwright/test'
import { electronTest } from './helpers'
import { LegendaryCommand } from '../src/backend/storeManagers/legendary/commands'

electronTest('Settings', async (app, page) => {
  // stub `legendary --version`
  await app.evaluate(({ ipcMain }) => {
    ipcMain.emit(
      'setRunLegendaryCommandStub',
      function (command: LegendaryCommand) {
        if (command['--version']) {
          return {
            stdout: 'legendary version "0.20.33", codename "Undue Alarm"',
            stderr: ''
          }
        } else {
          return {
            stdout: '',
            stderr: ''
          }
        }
      }
    )
  })

  await test.step('shows the Advanced settings', async () => {
    await page.getByTestId('settings').click()
    page.getByText('Global Settings')
    await page.getByText('Advanced').click()
    await page.waitForTimeout(1000)
  })

  await test.step('shows alternative binaries inputs', async () => {
    expect(
      page.getByLabel('Choose an Alternative Legendary Binary')
    ).toBeVisible()
    expect(
      page.getByLabel('Choose an Alternative GOGDL Binary to use')
    ).toBeVisible()
    expect(page.getByLabel('Choose an Alternative Nile Binary')).toBeVisible()
  })

  await test.step('shows the legendary version from the legendary command', async () => {
    expect(
      page.getByText('Legendary Version: 0.20.33 Undue Alarm')
    ).toBeVisible()
  })

  // TODO: add stubs for gogdl and nile
  // expect(page.getByText('GOGDL Version: 1.0.0')).toBeVisible()
  // expect(page.getByText('Nile Version: 1.0.0 Jonathan Joestar')).toBeVisible()

  await test.step('shows the default experimental features', async () => {
    expect(page.getByLabel('New design')).not.toBeChecked()
    expect(page.getByLabel('Help component')).not.toBeChecked()
    expect(page.getByLabel('Apply known fixes automatically')).toBeChecked()
  })
})
