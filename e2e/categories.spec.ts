import { expect, test } from '@playwright/test'
import { electronTest } from './helpers'

electronTest('categories', async (app) => {
  const page = await app.firstWindow()
  await page.evaluate(() => window.localStorage.clear())
  await page.evaluate(() => window.sessionStorage.clear())

  await test.step('add/rename/remove categories', async () => {
    // open categories manager
    await page.getByText('Categories', { exact: true }).click()
    await page.getByText('Manage categories').click()

    const dialog = page.getByRole('dialog')

    await expect(dialog.getByText('No categories yet.')).toBeInViewport()

    // add new category
    await dialog.getByPlaceholder('Add new category').fill('Great games')
    await dialog.getByTitle('Add', { exact: true }).click()
    await expect(dialog.getByText('No categories yet.')).not.toBeInViewport()
    await expect(
      dialog.locator('span', { hasText: 'Great games' })
    ).toBeInViewport()

    // rename category
    await dialog.getByTitle('Rename "Great games"').click()
    await dialog.getByLabel('Rename "Great games"').fill('Amazing games')
    await dialog
      .getByTitle('Confirm rename of "Great games" as "Amazing games"')
      .click()
    await expect(
      dialog.locator('span', { hasText: 'Amazing games' })
    ).toBeInViewport()
    await expect(dialog.getByText('Great games')).not.toBeInViewport()

    // cancel rename category
    await dialog.getByTitle('Rename "Amazing games"').click()
    await dialog.getByLabel('Rename "Amazing games"').fill('Bad games')
    await dialog.getByTitle('Cancel rename of "Amazing games"').click()
    await expect(
      dialog.locator('span', { hasText: 'Amazing games' })
    ).toBeInViewport()
    await expect(dialog.getByText('Bad games')).not.toBeInViewport()

    // cancel remove category
    await dialog.getByTitle('Remove "Amazing games"').click()
    await dialog.getByTitle('Cancel removal of "Amazing games"').click()
    await expect(
      dialog.locator('span', { hasText: 'Amazing games' })
    ).toBeInViewport()

    // remove category
    await dialog.getByTitle('Remove "Amazing games"').click()
    await dialog.getByTitle('Confirm removal of "Amazing games"').click()
    await expect(dialog.getByText('No categories yet.')).toBeInViewport()
    await expect(dialog.getByText('Amazing games')).not.toBeInViewport()
  })
})
