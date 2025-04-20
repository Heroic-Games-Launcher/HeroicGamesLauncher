import { thirdPartyInstalled } from 'backend/constants'
import { LogPrefix, logWarning, logError } from 'backend/logger/logger'
import { InstalledJsonMetadata } from 'common/types/legendary'
import { existsSync, readFileSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'

const getInstalledGames = (): [string, InstalledJsonMetadata][] => {
  if (existsSync(thirdPartyInstalled)) {
    try {
      const thirdPartyData = JSON.parse(
        readFileSync(thirdPartyInstalled, 'utf-8')
      ) as [string, string][]

      const installObjects: [string, InstalledJsonMetadata][] =
        thirdPartyData.map(([app_name, platform]) => [
          app_name,
          { app_name, platform } as InstalledJsonMetadata
        ])

      return installObjects
    } catch (error) {
      logWarning(
        ['Failed to read third-party-installed.json', error],
        LogPrefix.Legendary
      )
    }
  }
  return []
}

const addInstalledGame = async (appName: string, platform: string) => {
  const installedAppNames = []

  if (existsSync(thirdPartyInstalled)) {
    try {
      const buffer = await readFile(thirdPartyInstalled, 'utf-8')
      installedAppNames.push(...(JSON.parse(buffer) as [string, string][]))
    } catch (err) {
      logWarning(
        `Failed to read third-party-installed.json ${err}`,
        LogPrefix.Legendary
      )
    }
  }
  installedAppNames.push([appName, platform])

  try {
    await writeFile(
      thirdPartyInstalled,
      JSON.stringify(installedAppNames),
      'utf-8'
    )
  } catch (err) {
    logError(
      `Failed to write third-party-installed.json ${err}`,
      LogPrefix.Legendary
    )
  }
}

const removeInstalledGame = async (appName: string) => {
  const installedAppNames = []
  try {
    const buffer = await readFile(thirdPartyInstalled, 'utf-8')
    installedAppNames.push(...(JSON.parse(buffer) as [string, string][]))
  } catch (err) {
    logWarning(
      ['Failed to read third-party-installed.json:', err],
      LogPrefix.Legendary
    )
  }
  const index = installedAppNames.findIndex((a) => a[0] === appName)
  installedAppNames.splice(index, 1)

  try {
    await writeFile(
      thirdPartyInstalled,
      JSON.stringify(installedAppNames),
      'utf-8'
    )
  } catch (e) {
    logError(
      ['Failed to write third-party-installed.json:', e],
      LogPrefix.Legendary
    )
  }
}

export default { getInstalledGames, addInstalledGame, removeInstalledGame }
