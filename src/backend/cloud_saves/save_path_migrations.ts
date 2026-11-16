import type { GameSettings, Runner } from 'common/types'
import type { GOGCloudSavesLocation } from 'common/types/gog'

export const getSavePathMigrations = (
  runner: Runner,
  settings: GameSettings,
  newPaths: string | GOGCloudSavesLocation[]
): Array<[string, string]> => {
  const migrations: Array<[string, string]> = []

  if (runner === 'gog') {
    for (const newLocation of newPaths as GOGCloudSavesLocation[]) {
      const oldLocation = (settings.gogSaves ?? []).find(
        ({ name }) => name === newLocation.name
      )
      if (
        !oldLocation?.location ||
        oldLocation.location === newLocation.location
      ) {
        continue
      }
      migrations.push([oldLocation.location, newLocation.location])
    }
    return migrations
  }

  if (
    typeof newPaths === 'string' &&
    settings.savesPath &&
    settings.savesPath !== newPaths
  ) {
    migrations.push([settings.savesPath, newPaths])
  }

  return migrations
}
