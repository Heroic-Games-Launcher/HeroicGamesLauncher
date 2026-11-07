import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import {
  _electron as electron,
  ElectronApplication,
  expect,
  Page,
  test
} from '@playwright/test'

declare const window: { api: typeof import('../src/preload/api').default }

const main_js = join(__dirname, '../build/main/main.js')

async function launch(home: string): Promise<{
  app: ElectronApplication
  page: Page
}> {
  const app = await electron.launch({
    args: [main_js],
    env: { ...process.env, CI: 'e2e', HOME: home, USERPROFILE: home }
  })
  const page = await app.firstWindow()
  await page.locator('.Sidebar').waitFor({ state: 'visible' })
  return { app, page }
}

async function openImportExport(page: Page): Promise<void> {
  await page.locator('.Sidebar').getByText('Settings', { exact: true }).click()
  await page.getByRole('link', { name: 'Import / Export' }).click()
  await expect(page.getByText('Export Heroic')).toBeVisible()
}

async function openImportWizard(page: Page) {
  await page.getByText('Import a Heroic backup', { exact: true }).click()
  await page.getByRole('button', { name: 'Open import wizard' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
}

test('restores an exported backup into a clean install', async () => {
  test.setTimeout(180_000)

  const home = mkdtempSync(join(tmpdir(), 'heroic-e2e-restore-'))
  const installPath = join(home, 'GamesRestored')
  const executable = join(installPath, 'game.exe')
  const gogInstall = join(home, 'GOG Games', 'GOG Test')
  mkdirSync(installPath, { recursive: true })
  writeFileSync(executable, 'exe')
  mkdirSync(gogInstall, { recursive: true })

  let source: ElectronApplication | undefined
  let target: ElectronApplication | undefined
  try {
    // --- Source install: seed data, export to the default folder ---
    const appA = await launch(home)
    source = appA.app
    const pageA = appA.page

    const sourceUserData = await appA.app.evaluate(({ app }) =>
      app.getPath('userData')
    )
    writeJson(join(sourceUserData, 'gog_store', 'config.json'), {
      userData: { username: 'gog-tester' },
      isLoggedIn: true
    })
    writeJson(join(sourceUserData, 'gog_store', 'installed.json'), {
      installed: [
        { appName: 'gog-test', install_path: gogInstall, platform: 'windows' }
      ]
    })
    writeJson(join(sourceUserData, 'store_cache', 'gog_library.json'), {
      games: [{ app_name: 'gog-test', title: 'GOG Test' }]
    })
    writeJson(join(sourceUserData, 'itchio_store', 'config.json'), {
      profileId: 42,
      userData: { username: 'itch-tester' }
    })
    writeJson(join(sourceUserData, 'store_cache', 'itchio_library.json'), {
      library: [
        { app_name: 'itchio-1', title: 'Itch Test', is_installed: false }
      ]
    })

    // GameConfig loads asynchronously; read it once before setting a value so
    // the instance is initialised (same flow the settings UI uses).
    await pageA.evaluate(() => window.api.requestGameSettings('gog-test'))

    await pageA.evaluate(
      ({ installPath, executable }) => {
        window.api.setSetting({
          appName: 'default',
          key: 'defaultInstallPath',
          value: installPath
        })
        window.api.setSetting({
          appName: 'gog-test',
          key: 'enableQuickSavesMenu',
          value: true
        })
        window.api.addNewApp({
          runner: 'sideload',
          app_name: 'sideload-test',
          title: 'Sideload Test',
          art_cover: '',
          art_square: '',
          install: { executable, platform: 'linux', is_dlc: false },
          is_installed: true,
          canRunOffline: true
        })
      },
      { installPath, executable }
    )

    await expect
      .poll(async () =>
        pageA.evaluate(
          async () => (await window.api.requestAppSettings()).defaultInstallPath
        )
      )
      .toBe(installPath)
    await expect
      .poll(async () =>
        pageA.evaluate(
          async () =>
            (await window.api.requestGameSettings('gog-test'))
              .enableQuickSavesMenu
        )
      )
      .toBe(true)
    await expect
      .poll(async () =>
        pageA.evaluate(() =>
          window.api.getGameInfo('sideload-test', 'sideload')
        )
      )
      .not.toBeNull()

    await openImportExport(pageA)
    // Avoid the Wine metadata stage so the test doesn't depend on network.
    await pageA
      .locator('label.ToggleSwitch__track[for="ie-export-wineMetadata"]')
      .click()
    await expect(pageA.locator('#ie-export-wineMetadata')).not.toBeChecked()
    await expect(pageA.locator('#ie-export-dir')).toHaveValue(home)
    await pageA.getByRole('button', { name: 'Export', exact: true }).click()
    await expect(pageA.getByText('Saved to')).toBeVisible({ timeout: 30_000 })

    const backupName = readdirSync(home).find(
      (file) => file.startsWith('heroic-backup-') && file.endsWith('.zip')
    )
    expect(backupName).toBeTruthy()

    await appA.app.close()
    source = undefined

    // --- Clean install: import the backup and verify the restored state ---
    const appB = await launch(home)
    target = appB.app
    const pageB = appB.page

    await test.step('starts without the source data', async () => {
      const settings = await pageB.evaluate(() =>
        window.api.requestAppSettings()
      )
      expect(settings.defaultInstallPath).not.toBe(installPath)

      const gameSettings = await pageB.evaluate(() =>
        window.api.requestGameSettings('gog-test')
      )
      expect(gameSettings.enableQuickSavesMenu).not.toBe(true)
    })

    await test.step('imports the discovered backup', async () => {
      await openImportExport(pageB)
      const dialog = await openImportWizard(pageB)

      await expect(
        dialog.getByRole('button', { name: new RegExp(backupName!) })
      ).toBeVisible()
      await dialog
        .getByRole('button', { name: new RegExp(backupName!) })
        .click()
      await expect(
        dialog.getByRole('heading', { name: 'Backup summary' })
      ).toBeVisible({ timeout: 15_000 })

      await pageB.getByRole('button', { name: 'Next' }).click()
      await expect(
        dialog.getByRole('heading', { name: 'Global settings' })
      ).toBeVisible()
      await dialog
        .locator('label.ToggleSwitch__track[for="ie-overwrite-global"]')
        .click()
      await expect(dialog.locator('#ie-overwrite-global')).toBeChecked()

      await pageB.getByRole('button', { name: 'Next' }).click()
      await expect(
        dialog.getByRole('heading', { name: 'Per-game settings to import' })
      ).toBeVisible()

      await pageB.getByRole('button', { name: 'Next' }).click()
      await expect(
        dialog.getByRole('heading', { name: 'Store logins' })
      ).toBeVisible()
      const credentials = dialog.locator('.ImportExportWizard__credList')
      await expect(credentials.getByText('GOG', { exact: true })).toBeVisible()
      await expect(
        credentials.getByText('itch.io', { exact: true })
      ).toBeVisible()

      await pageB.getByRole('button', { name: 'Next' }).click()
      await expect(
        dialog.getByRole('heading', { name: 'Library and system' })
      ).toBeVisible()

      await dialog.getByRole('button', { name: 'Apply backup' }).click()
      await expect(
        dialog.getByRole('heading', { name: 'Backup applied' })
      ).toBeVisible({ timeout: 60_000 })
    })

    await test.step('restores settings, credentials, libraries and games', async () => {
      const settings = await pageB.evaluate(() =>
        window.api.requestAppSettings()
      )
      expect(settings.defaultInstallPath).toBe(installPath)

      const gameSettings = await pageB.evaluate(() =>
        window.api.requestGameSettings('gog-test')
      )
      expect(gameSettings.enableQuickSavesMenu).toBe(true)

      const targetUserData = await appB.app.evaluate(({ app }) =>
        app.getPath('userData')
      )

      const gogConfig = JSON.parse(
        readFileSync(join(targetUserData, 'gog_store', 'config.json'), 'utf-8')
      ) as { userData?: { username?: string } }
      expect(gogConfig.userData?.username).toBe('gog-tester')

      const itchioConfig = JSON.parse(
        readFileSync(
          join(targetUserData, 'itchio_store', 'config.json'),
          'utf-8'
        )
      ) as { userData?: { username?: string } }
      expect(itchioConfig.userData?.username).toBe('itch-tester')

      const gogLibrary = JSON.parse(
        readFileSync(
          join(targetUserData, 'store_cache', 'gog_library.json'),
          'utf-8'
        )
      ) as { games?: Array<{ app_name?: string }> }
      expect(gogLibrary.games?.[0]?.app_name).toBe('gog-test')

      const itchioLibrary = JSON.parse(
        readFileSync(
          join(targetUserData, 'store_cache', 'itchio_library.json'),
          'utf-8'
        )
      ) as { library?: Array<{ app_name?: string }> }
      expect(itchioLibrary.library?.[0]?.app_name).toBe('itchio-1')

      const gogInstalled = JSON.parse(
        readFileSync(
          join(targetUserData, 'gog_store', 'installed.json'),
          'utf-8'
        )
      ) as { installed?: Array<{ appName?: string; install_path?: string }> }
      expect(gogInstalled.installed?.[0]?.appName).toBe('gog-test')
      expect(gogInstalled.installed?.[0]?.install_path).toBe(gogInstall)

      const sideload = JSON.parse(
        readFileSync(
          join(targetUserData, 'sideload_apps', 'library.json'),
          'utf-8'
        )
      ) as { games?: Array<{ app_name?: string; title?: string }> }
      expect(
        sideload.games?.find((game) => game.app_name === 'sideload-test')?.title
      ).toBe('Sideload Test')
    })
  } finally {
    await source?.close()
    await target?.close()
    rmSync(home, { recursive: true, force: true })
  }
})

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
      await openImportExport(page)
      await expect(page.locator('#ie-export-dir')).toHaveValue(home)

      await page.getByRole('button', { name: 'Export', exact: true }).click()
      await expect(page.getByText('Saved to')).toBeVisible({ timeout: 30_000 })
    })

    await test.step('discovers the exported backup in the import wizard', async () => {
      const dialog = await openImportWizard(page)

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
