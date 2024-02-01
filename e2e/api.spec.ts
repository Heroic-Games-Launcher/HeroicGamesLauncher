import { expect, test } from '@playwright/test'
import { compareVersions } from 'compare-versions'
import { electronTest } from './helpers'

declare const window: { api: typeof import('../src/backend/api').default }

electronTest('renders the first page', async (app, page) => {
  await expect(page).toHaveTitle('Heroic Games Launcher')
})

electronTest('gets heroic, legendary, and gog versions', async (app, page) => {
  await test.step('get heroic version', async () => {
    const heroicVersion = await page.evaluate(async () =>
      window.api.getHeroicVersion()
    )
    console.log('Heroic Version: ', heroicVersion)
    // check that heroic version is newer or equal to 2.6.3
    expect(compareVersions(heroicVersion, '2.6.3')).toBeGreaterThanOrEqual(0)
  })

  await test.step('get legendary version', async () => {
    let legendaryVersion = await page.evaluate(async () =>
      window.api.getLegendaryVersion()
    )
    legendaryVersion = legendaryVersion.trim().split(' ')[0]
    console.log('Legendary Version: ', legendaryVersion)
    expect(compareVersions(legendaryVersion, '0.20.32')).toBeGreaterThanOrEqual(
      0
    )
  })

  await test.step('get gogdl version', async () => {
    const gogdlVersion = await page.evaluate(async () =>
      window.api.getGogdlVersion()
    )
    console.log('Gogdl Version: ', gogdlVersion)
    expect(compareVersions(gogdlVersion, '0.7.1')).toBeGreaterThanOrEqual(0)
  })
})
