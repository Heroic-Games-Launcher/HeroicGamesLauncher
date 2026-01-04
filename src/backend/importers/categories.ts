import { configStore } from 'backend/constants/key_value_stores'
import { notify } from 'backend/dialog/dialog'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import { readFileSync } from 'graceful-fs'
import i18next from 'i18next'

export const importCategories = (filePath: string) => {
  logInfo(`Importing categories from ${filePath}`, LogPrefix.Backend)

  const categories = configStore.get('games.customCategories', {})

  const notificationTitle = i18next.t(
    'notify.importCategories.title',
    'Categories import'
  )

  try {
    const content = readFileSync(filePath).toString()
    const jsonContent = JSON.parse(content) as Record<string, string[]>

    for (const key in jsonContent) {
      // some checks to ensure we don't break the categories if the
      // json file is not the correct format
      // only allow string keys
      if (typeof key !== 'string') continue

      // only allow an array of strings
      if (!Array.isArray(jsonContent[key])) continue
      const gameIds = jsonContent[key].filter((val) => typeof val === 'string')

      const combinedGames = new Set<string>(
        (categories[key] || []).concat(gameIds)
      )
      categories[key] = [...combinedGames]
    }

    configStore.set('games.customCategories', categories)

    const notificationBody = i18next.t('notify.importCategories.done', 'Done')
    notify({ title: notificationTitle, body: notificationBody })
    logInfo('Categories imported', LogPrefix.Backend)
  } catch (error) {
    const notificationBody = i18next.t(
      'notify.importCategories.error',
      'Failed. Check logs for details'
    )
    notify({
      title: notificationTitle,
      body: notificationBody
    })
    logError(`Error importing categories ${error}`, LogPrefix.Backend)
  }
}
