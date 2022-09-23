import { WineInstallation, InstallPlatform } from 'common/types'
import React from 'react'
import { AvailablePlatforms } from '..'

type Props = {
  setWineVersion: React.Dispatch<
    React.SetStateAction<WineInstallation | undefined>
  >
  setWinePrefix: React.Dispatch<React.SetStateAction<string>>
  availablePlatforms: AvailablePlatforms
  wineVersionList: WineInstallation[]
  setPlatformToInstall: React.Dispatch<React.SetStateAction<InstallPlatform>>
  winePrefix: string
  wineVersion: WineInstallation | undefined
  hasWine: boolean
}

export default function SideloadDialog({
  setWinePrefix,
  setPlatformToInstall,
  setWineVersion,
  availablePlatforms,
  winePrefix,
  wineVersion,
  wineVersionList,
  hasWine
}: Props) {
  console.log({
    setWinePrefix,
    setPlatformToInstall,
    setWineVersion,
    availablePlatforms,
    winePrefix,
    wineVersion,
    wineVersionList,
    hasWine
  })
  return <div>SideLoad</div>
}
