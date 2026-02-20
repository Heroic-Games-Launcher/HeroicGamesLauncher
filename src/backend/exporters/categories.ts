import { configStore } from 'backend/constants/key_value_stores'
import { notify } from 'backend/dialog/dialog'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import { mkdirSync, writeFileSync } from 'graceful-fs'
import i18next from 'i18next'
import { join } from 'path'

export const exportCategories = (destinationDirPath: string) => {
  const destinationPath = join(destinationDirPath, 'categories.json')
  logInfo(`Exporting categories to ${destinationPath}`, LogPrefix.Backend)

  const categories = configStore.get('games.customCategories', {})

  const notificationTitle = i18next.t(
    'notify.exportCategories.title',
    'Categories export'
  )

  try {
    mkdirSync(destinationDirPath, { recursive: true })
    writeFileSync(destinationPath, JSON.stringify(categories, null, 2))

    const notificationBody = i18next.t('notify.exportCategories.saved', {
      defaultValue: 'Saved in {{exportPath}}.',
      exportPath: destinationPath
    })
    notify({ title: notificationTitle, body: notificationBody })
    logInfo(`Categories exported to ${destinationPath}`, LogPrefix.Backend)
  } catch (error) {
    const notificationBody = i18next.t(
      'notify.exportCategories.error',
      'Failed. Check logs for details'
    )
    notify({
      title: notificationTitle,
      body: notificationBody
    })
    logError(
      `Error writing categories to ${destinationPath}: ${error}`,
      LogPrefix.Backend
    )
  }
}
