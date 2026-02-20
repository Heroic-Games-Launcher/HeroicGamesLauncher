import { addHandler } from 'backend/ipc'
import { importCategories } from './categories'

addHandler('importCategories', (event, filePath) => {
  importCategories(filePath)
})
