import { faApple, faLinux, faWindows } from '@fortawesome/free-brands-svg-icons'
import { IconDefinition } from '@fortawesome/free-solid-svg-icons'

import React, { useContext, useEffect, useState } from 'react'

import ContextProvider from 'frontend/state/ContextProvider'
import { InstallPlatform, Runner, WineInstallation } from 'common/types'
import { Dialog } from 'frontend/components/UI/Dialog'

import './index.css'

import DownloadDialog from './DownloadDialog'
import SideloadDialog from './SideloadDialog'
import WineSelector from './WineSelector'

type Props = {
  appName: string
  backdropClick: () => void
  runner: Runner
}

export type AvailablePlatforms = {
  name: string
  available: boolean
  value: string
  icon: IconDefinition
}[]

export default function InstallModal({
  appName,
  backdropClick,
  runner
}: Props) {
  const { platform } = useContext(ContextProvider)

  const [winePrefix, setWinePrefix] = useState('...')
  const [wineVersion, setWineVersion] = useState<WineInstallation | undefined>(
    undefined
  )
  const [wineVersionList, setWineVersionList] = useState<WineInstallation[]>([])

  const [isLinuxNative, setIsLinuxNative] = useState(false)
  const [isMacNative, setIsMacNative] = useState(false)
  const [defaultPlatform, setDefaultPlatform] =
    useState<InstallPlatform>('Windows')

  const isMac = platform === 'darwin'
  const isLinux = platform === 'linux'
  const isSideload = runner === 'sideload'

  const platforms: AvailablePlatforms = [
    {
      name: 'Linux',
      available: (isLinux && isSideload) || (isLinuxNative && !isMac),
      value: 'Linux',
      icon: faLinux
    },
    {
      name: 'macOS',
      available: (isMac && isSideload) || (isMacNative && !isLinux),
      value: 'Mac',
      icon: faApple
    },
    {
      name: 'Windows',
      available: true,
      value: 'Windows',
      icon: faWindows
    }
  ]

  const availablePlatforms: AvailablePlatforms = platforms.filter(
    (p) => p.available
  )

  useEffect(() => {
    const selectedPlatform = isLinuxNative
      ? 'linux'
      : isMacNative
      ? 'Mac'
      : 'Windows'

    setPlatformToInstall(selectedPlatform)
    setDefaultPlatform(selectedPlatform)
  }, [isLinuxNative, isMacNative])

  const [platformToInstall, setPlatformToInstall] =
    useState<InstallPlatform>(defaultPlatform)

  const hasWine = platformToInstall === 'Windows' && isLinux

  useEffect(() => {
    if (hasWine) {
      ;(async () => {
        const newWineList: WineInstallation[] =
          await window.api.getAlternativeWine()
        if (Array.isArray(newWineList)) {
          setWineVersionList(newWineList)
          if (wineVersion?.bin) {
            if (
              !newWineList.some(
                (newWine) => wineVersion && newWine.bin === wineVersion.bin
              )
            ) {
              setWineVersion(undefined)
            }
          }
        }
      })()
    }
  }, [hasWine, wineVersion])

  return (
    <div className="InstallModal">
      <Dialog onClose={backdropClick} className={'InstallModal__dialog'}>
        {!isSideload ? (
          <DownloadDialog
            {...{
              platformToInstall,
              wineVersionList,
              setIsLinuxNative,
              backdropClick,
              availablePlatforms,
              setWinePrefix,
              appName,
              runner,
              setIsMacNative,
              setPlatformToInstall,
              setWineVersion,
              winePrefix,
              hasWine,
              wineVersion
            }}
          >
            {hasWine ? (
              <WineSelector
                {...{
                  winePrefix,
                  wineVersion,
                  wineVersionList,
                  setWinePrefix,
                  setWineVersion,
                  runner,
                  appName
                }}
              />
            ) : null}
          </DownloadDialog>
        ) : (
          <SideloadDialog
            {...{
              setWinePrefix,
              setPlatformToInstall,
              setWineVersion,
              availablePlatforms,
              winePrefix,
              wineVersion,
              wineVersionList,
              hasWine
            }}
          >
            {hasWine ? (
              <WineSelector
                {...{
                  winePrefix,
                  wineVersion,
                  wineVersionList,
                  setWinePrefix,
                  setWineVersion,
                  runner,
                  appName
                }}
              />
            ) : null}
          </SideloadDialog>
        )}
      </Dialog>
    </div>
  )
}
