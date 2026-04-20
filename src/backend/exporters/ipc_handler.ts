import { addHandler } from 'backend/ipc'
import { exportCategories } from './categories'
import { exportsPath } from 'backend/constants/paths'

addHandler('exportCategories', () => {
  exportCategories(exportsPath)
})
