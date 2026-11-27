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
