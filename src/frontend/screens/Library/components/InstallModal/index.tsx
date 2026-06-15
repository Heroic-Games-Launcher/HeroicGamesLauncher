import { faApple, faLinux, faWindows } from '@fortawesome/free-brands-svg-icons'
import { IconDefinition, faGlobe } from '@fortawesome/free-solid-svg-icons'

import { useContext, useEffect, useRef, useState } from 'react'

import ContextProvider from 'frontend/state/ContextProvider'
import {
  GameInfo,
  InstallPlatform,
  Runner,
  WineInstallation
} from 'common/types'
import { Dialog } from 'frontend/components/UI/Dialog'

import './index.scss'

import DownloadDialog from './DownloadDialog'
import ImportDialog from './ImportDialog'
import SideloadDialog from './SideloadDialog'
import WineSelector from './WineSelector'
import { SelectField } from 'frontend/components/UI'
import { useTranslation } from 'react-i18next'
import ThirdPartyDialog from './ThirdPartyDialog'
import { Box, MenuItem, SvgIcon } from '@mui/material'
import {
  closeInstallGameModal,
  useInstallGameModal
} from 'frontend/state/InstallGameModal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

type Props = {
  appName: string
  runner: Runner
  gameInfo?: GameInfo | null
}

export type AvailablePlatforms = {
  name: string
  available: boolean
  value: InstallPlatform
  icon: IconDefinition
}[]

function InstallModal({ appName, runner, gameInfo = null }: Props) {
  const { platform } = useContext(ContextProvider)
  const { t, i18n } = useTranslation('gamepage')
  const { action = 'install' } = useInstallGameModal()

  const [winePrefix, setWinePrefix] = useState('...')
  const [wineVersion, setWineVersion] = useState<WineInstallation>()
  const [wineVersionList, setWineVersionList] = useState<WineInstallation[]>([])
  const [crossoverBottle, setCrossoverBottle] = useState('')
  const [sideloadTitle, setSideloadTitle] = useState(
    t('sideload.field.title', 'Title')
  )

  const [steamPlatforms, setSteamPlatforms] = useState<
    InstallPlatform[] | null
  >(null)

  useEffect(() => {
    if (runner !== 'steam') {
      return
    }
    let active = true
    window.api
      .getExtraInfo(
        appName,
        runner,
        runner === 'steam' ? i18n.language : undefined
      )
      .then((info) => {
        if (active && info?.platforms) {
          setSteamPlatforms(info.platforms)
        }
      })
      .catch(() => {
        // Falls back to Windows for Proton
      })
    return () => {
      active = false
    }
  }, [appName, runner, i18n.language])

  const isLinuxNative =
    runner === 'steam'
      ? Boolean(steamPlatforms?.includes('linux'))
      : Boolean(gameInfo?.is_linux_native)
  const isMacNative =
    runner === 'steam'
      ? Boolean(steamPlatforms?.includes('Mac'))
      : Boolean(gameInfo?.is_mac_native)

  const isMac = platform === 'darwin'
  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'
  const isSideload = runner === 'sideload'

  const platforms: AvailablePlatforms = [
    {
      name: 'Linux',
      available: isLinux && (isSideload || isLinuxNative),
      value: 'linux',
      icon: faLinux
    },
    {
      name: 'macOS',
      available: isMac && (isSideload || isMacNative),
      value: 'Mac',
      icon: faApple
    },
    {
      name: 'Windows',
      available: true,
      value: 'Windows',
      icon: faWindows
    },
    {
      name: 'Browser',
      available: isSideload,
      value: 'Browser',
      icon: faGlobe
    }
  ]

  const availablePlatforms: AvailablePlatforms = platforms.filter(
    (p) => p.available
  )

  const getDefaultplatform = (): InstallPlatform => {
    // Prefer the current OS's platform .
    const currentPlatform: InstallPlatform = isMac
      ? 'Mac'
      : isLinux
        ? 'linux'
        : 'Windows'

    if (availablePlatforms.some((p) => p.value === currentPlatform)) {
      return currentPlatform
    }

    return 'Windows'
  }

  const [platformToInstall, setPlatformToInstall] =
    useState<InstallPlatform>(getDefaultplatform())

  const userPickedPlatform = useRef(false)
  useEffect(() => {
    if (runner === 'steam' && steamPlatforms && !userPickedPlatform.current) {
      setPlatformToInstall(getDefaultplatform())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steamPlatforms, runner])

  const hasWine =
    platformToInstall === 'Windows' && !isWin && runner !== 'steam'

  useEffect(() => {
    if (hasWine) {
      const getWine = async () => {
        const newWineList: WineInstallation[] =
          await window.api.getAlternativeWine()
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
      getWine()
    }
  }, [hasWine])

  function platformSelection() {
    const showPlatformSelection = availablePlatforms.length > 1

    if (!showPlatformSelection) {
      return null
    }
    const disabledPlatformSelection = Boolean(runner === 'sideload' && appName)
    return (
      <SelectField
        label={`${t('game.platform', 'Select Platform Version to Install')}:`}
        htmlId="platformPick"
        value={platformToInstall}
        disabled={disabledPlatformSelection}
        onChange={(e) => {
          userPickedPlatform.current = true
          setPlatformToInstall(e.target.value as InstallPlatform)
        }}
      >
        {availablePlatforms.map((p, i) => (
          <MenuItem value={p.value} key={i}>
            <Box sx={{ display: 'flex', placeItems: 'center' }}>
              <SvgIcon sx={{ marginInlineEnd: 1 }}>
                <FontAwesomeIcon icon={p.icon} />
              </SvgIcon>
              {p.name}
            </Box>
          </MenuItem>
        ))}
      </SelectField>
    )
  }

  const showDownloadDialog = !isSideload && gameInfo
  const isThirdPartyManagedApp = gameInfo && !!gameInfo.thirdPartyManagedApp
  const isImportMode = action === 'import'

  const closeModal = () => closeInstallGameModal()

  return (
    <div className="InstallModal">
      <Dialog
        onClose={closeModal}
        showCloseButton
        className="InstallModal__dialog"
      >
        {isThirdPartyManagedApp ? (
          <ThirdPartyDialog
            appName={appName}
            runner={runner}
            winePrefix={winePrefix}
            wineVersion={wineVersion}
            availablePlatforms={availablePlatforms}
            backdropClick={closeModal}
            platformToInstall={platformToInstall}
            gameInfo={gameInfo}
            crossoverBottle={crossoverBottle}
          >
            {platformSelection()}
            {hasWine ? (
              <WineSelector
                appName={appName}
                winePrefix={winePrefix}
                wineVersion={wineVersion}
                wineVersionList={wineVersionList}
                title={gameInfo?.title}
                setWinePrefix={setWinePrefix}
                setWineVersion={setWineVersion}
                crossoverBottle={crossoverBottle}
                setCrossoverBottle={setCrossoverBottle}
                initiallyOpen
              />
            ) : null}
          </ThirdPartyDialog>
        ) : isImportMode && showDownloadDialog ? (
          <ImportDialog
            appName={appName}
            runner={runner}
            winePrefix={winePrefix}
            wineVersion={wineVersion}
            availablePlatforms={availablePlatforms}
            backdropClick={closeModal}
            platformToInstall={platformToInstall}
            gameInfo={gameInfo}
            crossoverBottle={crossoverBottle}
          >
            {platformSelection()}
            {hasWine ? (
              <WineSelector
                appName={appName}
                winePrefix={winePrefix}
                wineVersion={wineVersion}
                wineVersionList={wineVersionList}
                title={gameInfo?.title}
                setWinePrefix={setWinePrefix}
                setWineVersion={setWineVersion}
                crossoverBottle={crossoverBottle}
                setCrossoverBottle={setCrossoverBottle}
              />
            ) : null}
          </ImportDialog>
        ) : showDownloadDialog ? (
          <DownloadDialog
            appName={appName}
            runner={runner}
            winePrefix={winePrefix}
            wineVersion={wineVersion}
            availablePlatforms={availablePlatforms}
            backdropClick={closeModal}
            platformToInstall={platformToInstall}
            setPlatformToInstall={setPlatformToInstall}
            gameInfo={gameInfo}
            crossoverBottle={crossoverBottle}
          >
            {platformSelection()}
            {hasWine ? (
              <WineSelector
                appName={appName}
                winePrefix={winePrefix}
                wineVersion={wineVersion}
                wineVersionList={wineVersionList}
                title={gameInfo?.title}
                setWinePrefix={setWinePrefix}
                setWineVersion={setWineVersion}
                crossoverBottle={crossoverBottle}
                setCrossoverBottle={setCrossoverBottle}
              />
            ) : null}
          </DownloadDialog>
        ) : (
          <SideloadDialog
            title={sideloadTitle}
            setTitle={setSideloadTitle}
            winePrefix={winePrefix}
            wineVersion={wineVersion}
            availablePlatforms={availablePlatforms}
            backdropClick={closeModal}
            platformToInstall={platformToInstall}
            appName={appName}
          >
            {platformSelection()}
            {hasWine ? (
              <WineSelector
                appName={appName}
                winePrefix={winePrefix}
                wineVersion={wineVersion}
                wineVersionList={wineVersionList}
                setWinePrefix={setWinePrefix}
                setWineVersion={setWineVersion}
                crossoverBottle={crossoverBottle}
                setCrossoverBottle={setCrossoverBottle}
                title={sideloadTitle}
              />
            ) : null}
          </SideloadDialog>
        )}
      </Dialog>
    </div>
  )
}

export function InstallGameWrapper() {
  const installGameModalState = useInstallGameModal()

  if (!installGameModalState.isOpen) {
    return <></>
  }

  return (
    <InstallModal
      appName={installGameModalState.appName!}
      runner={installGameModalState.runner!}
      gameInfo={installGameModalState.gameInfo}
    />
  )
}
