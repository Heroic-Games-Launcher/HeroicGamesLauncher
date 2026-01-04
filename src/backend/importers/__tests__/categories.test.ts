import { join } from 'path'
import { importCategories } from '../categories'
import { configStore } from 'backend/constants/key_value_stores'

jest.mock('backend/logger')
jest.mock('backend/dialog/dialog')

describe('Categories import', () => {
  const testFilesDir = join(__dirname, 'file')

  describe('With no previous categories', () => {
    it('Adds all categories', () => {
      configStore.set('games.customCategories', {})

      importCategories(join(testFilesDir, 'good_categories.json'))

      expect(configStore.get('games.customCategories', {})).toEqual({
        'To Import 1': ['1', '2', '3'],
        'Category 2': ['2', '4', '5']
      })
    })
  })

  describe('With previous categories', () => {
    const categories = {
      'Category 1': ['1', '2'],
      'Category 2': ['2', '3']
    }

    it('Merges old and new categories', () => {
      configStore.set('games.customCategories', categories)

      importCategories(join(testFilesDir, 'good_categories.json'))

      expect(configStore.get('games.customCategories', {})).toEqual({
        'Category 1': ['1', '2'],
        'To Import 1': ['1', '2', '3'],
        'Category 2': ['2', '3', '4', '5']
      })
    })
  })

  describe('With invalid JSON content', () => {
    it('Skips invalid key/value pairs', () => {
      configStore.set('games.customCategories', {})

      importCategories(join(testFilesDir, 'invalid_file.json'))

      expect(configStore.get('games.customCategories', {})).toEqual({
        'this one': ['is fine']
      })
    })
  })
})
