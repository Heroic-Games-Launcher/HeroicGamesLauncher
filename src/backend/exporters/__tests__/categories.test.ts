import { exportCategories } from '../categories'
import { configStore } from 'backend/constants/key_value_stores'
import { dirSync } from 'tmp'
import { join } from 'path'
import { readFileSync } from 'graceful-fs'

jest.mock('backend/logger')
jest.mock('backend/dialog/dialog')

describe('Categories export', () => {
  const categories = {
    'Category 1': ['1', '2'],
    'Category 2': ['2', '3']
  }

  configStore.set('games.customCategories', categories)

  afterEach(() => {
    configStore.set('games.customCategories', {})
  })

  it('exports the current categories information as JSON', async () => {
    const tmpObj = dirSync({ unsafeCleanup: true })
    const exportsPath = join(tmpObj.name, 'Exports')

    exportCategories(exportsPath)

    const content = readFileSync(
      join(exportsPath, 'categories.json')
    ).toString()
    const json = JSON.parse(content)

    expect(json).toEqual(categories)

    tmpObj.removeCallback()
  })
})
