import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { _electron as electron, expect, test } from '@playwright/test'

const main_js = join(__dirname, '../build/main/main.js')

test('lists backups saved in the default folder in the import wizard', async () => {
  const home = mkdtempSync(join(tmpdir(), 'heroic-e2e-home-'))
  const app = await electron.launch({
    args: [main_js],
    env: { ...process.env, CI: 'e2e', HOME: home }
  })

  try {
    const page = await app.firstWindow()
    await page.locator('.Sidebar').waitFor({ state: 'visible' })

    await test.step('export a backup to the default folder', async () => {
      await page
        .locator('.Sidebar')
        .getByText('Settings', { exact: true })
        .click()
      await page.getByRole('link', { name: 'Import / Export' }).click()

      await expect(page.getByText('Export Heroic')).toBeVisible()
      await expect(page.locator('#ie-export-dir')).toHaveValue(home)

      await page.getByRole('button', { name: 'Export', exact: true }).click()
      await expect(page.getByText('Saved to')).toBeVisible({ timeout: 30_000 })
    })

    await test.step('discovers the exported backup in the import wizard', async () => {
      await page.getByText('Import a Heroic backup', { exact: true }).click()
      await page.getByRole('button', { name: 'Open import wizard' }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()

      await expect(
        dialog.getByText('Backups found in', { exact: false })
      ).toContainText(home)
      const backupRow = dialog.getByRole('button', {
        name: /heroic-backup-.*\.zip/
      })
      await expect(backupRow).toBeVisible()

      await backupRow.click()
      await expect(
        dialog.getByText('Backup summary', { exact: true })
      ).toBeVisible({ timeout: 15_000 })
    })
  } finally {
    await app.close()
    rmSync(home, { recursive: true, force: true })
  }
})
