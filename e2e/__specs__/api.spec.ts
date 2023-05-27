import { DiskSpaceData } from '../../src/common/types'
// import '../../common/types/proxy-types'
import { expect, test } from '@playwright/test'
import { ipcMainInvokeHandler } from 'electron-playwright-helpers'
import { Page } from 'playwright'
import { compareVersions } from 'compare-versions'
import { platform as platformOS } from 'os'
import commonSetup, { electronApp } from './common-setup'

test.describe('api e2e test', function () {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore: this is the correct usage
  commonSetup.call(this)

  let page: Page
  test('renders the first page', async () => {
    page = await electronApp.firstWindow()
    const title = await page.title()
    expect(title).toBe('Heroic Games Launcher')
  })

  test('gets heroic, legendary, and gog versions', async () => {
    const heroicVersion = await page.evaluate(async () => {
      return window.api.getHeroicVersion()
    })
    console.log('Heroic Version: ', heroicVersion)
    // check that heroic version is newer or equal to 2.6.3
    expect(compareVersions(heroicVersion, '2.6.3')).toBeGreaterThanOrEqual(0)

    let legendaryVersion = await page.evaluate(async () => {
      return window.api.getLegendaryVersion()
    })
    legendaryVersion = legendaryVersion.trim().split(' ')[0]
    console.log('Legendary Version: ', legendaryVersion)
    expect(compareVersions(legendaryVersion, '0.20.32')).toBeGreaterThanOrEqual(
      0
    )

    const gogdlVersion = await page.evaluate(async () => {
      return window.api.getGogdlVersion()
    })
    console.log('Gogdl Version: ', gogdlVersion)
    expect(compareVersions(gogdlVersion, '0.7.1')).toBeGreaterThanOrEqual(0)
  })

  test('test ipcMainInvokeHandler', async () => {
    const platform: DiskSpaceData = (await ipcMainInvokeHandler(
      electronApp,
      'getPlatform'
    )) as DiskSpaceData
    console.log('Platform: ', platform)
    expect(platform).toEqual(platformOS())
  })
})
