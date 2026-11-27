import { WineInstallation } from 'common/types'

/**
 * Picks the configured Game Defaults version when it is installed, matching on
 * the binary path so aliases and duplicate names are not confused, and falls
 * back to the first detected version.
 */
export function selectDefaultWineVersion(
  configuredVersion: WineInstallation | undefined | null,
  wineVersionList: WineInstallation[]
): WineInstallation | undefined {
  if (configuredVersion) {
    const configured = wineVersionList.find(
      ({ bin }) => bin === configuredVersion.bin
    )

    if (configured) {
      return configured
    }
  }

  return wineVersionList.at(0)
}

/**
 * Returns the version the dialog should show after a parent reset or a
 * refetched list. A user-picked selection is never replaced; otherwise the
 * default is applied again when the current version is gone.
 */
export function isWineVersionListed(
  version: WineInstallation | undefined,
  wineVersionList: WineInstallation[]
): boolean {
  return !!version && wineVersionList.some(({ bin }) => bin === version.bin)
}

export function repickWineVersion(
  currentVersion: WineInstallation | undefined,
  configuredVersion: WineInstallation | undefined | null,
  wineVersionList: WineInstallation[],
  userPicked: boolean
): WineInstallation | undefined {
  const currentInList = currentVersion
    ? wineVersionList.find(({ bin }) => bin === currentVersion.bin)
    : undefined

  if (currentInList) {
    return currentInList
  }

  if (userPicked) {
    return undefined
  }

  return selectDefaultWineVersion(configuredVersion, wineVersionList)
}
