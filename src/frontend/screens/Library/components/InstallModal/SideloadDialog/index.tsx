import './index.scss'
import short from 'short-uuid'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { InstallPlatform, WineInstallation, GameInfo } from 'common/types'
import {
  CachedImage,
  TextInputField,
  PathSelectionBox,
  ToggleSwitch
} from 'frontend/components/UI'
import { DialogContent, DialogFooter } from 'frontend/components/UI/Dialog'
import {
  getGameInfo,
  getGameSettings,
  removeSpecialcharacters,
  writeConfig
} from 'frontend/helpers'
import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AvailablePlatforms } from '..'
import fallbackImage from 'frontend/assets/heroic_card.jpg'
import ContextProvider from 'frontend/state/ContextProvider'
import classNames from 'classnames'
import axios from 'axios'

type Props = {
  availablePlatforms: AvailablePlatforms
  winePrefix: string
  crossoverBottle: string
  wineVersion: WineInstallation | undefined
  setWinePrefix: React.Dispatch<React.SetStateAction<string>>
  children: React.ReactNode
  platformToInstall: InstallPlatform
  backdropClick: () => void
  appName?: string
}

export default function SideloadDialog({
  availablePlatforms,
  backdropClick,
  winePrefix,
  crossoverBottle,
  wineVersion,
  platformToInstall,
  setWinePrefix,
  children,
  appName
}: Props) {
  const { t } = useTranslation('gamepage')
  const [title, setTitle] = useState<string>(t('sideload.field.title', 'Title'))
  const [selectedExe, setSelectedExe] = useState('')
  const [gameUrl, setGameUrl] = useState('')
  const [customUserAgent, setCustomUserAgent] = useState('')
  const [launchFullScreen, setLaunchFullScreen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [searching, setSearching] = useState(false)
  const [app_name, setApp_name] = useState(appName ?? '')
  const [runningSetup, setRunningSetup] = useState(false)
  const [gameInfo, setGameInfo] = useState<Partial<GameInfo>>({})
  const [addingApp, setAddingApp] = useState(false)
  const editMode = Boolean(appName)

  const { refreshLibrary } = useContext(ContextProvider)

  function handleTitle(value: string) {
    value = removeSpecialcharacters(value)
    setTitle(value)
  }

  const appPlatform = gameInfo.install?.platform || platformToInstall

  useEffect(() => {
    if (appName) {
      getGameInfo(appName, 'sideload').then((info) => {
        if (!info || info.runner !== 'sideload') {
          return
        }
        setGameInfo(info)
        const {
          art_cover,
          art_square,
          install: { executable, platform },
          title,
          browserUrl,
          customUserAgent,
          launchFullScreen
        } = info

        if (executable && platform) {
          setSelectedExe(executable)
        }

        if (browserUrl) {
          setGameUrl(browserUrl)
        }

        if (customUserAgent) {
          setCustomUserAgent(customUserAgent)
        }

        console.log(launchFullScreen)
        if (launchFullScreen !== undefined) {
          setLaunchFullScreen(launchFullScreen)
        }

        setTitle(title)
        setImageUrl(art_cover ? art_cover : art_square)
      })
    } else {
      setApp_name(short.generate().toString())
    }
  }, [])

  // Suggest default Wine prefix if we're adding a new app
  useEffect(() => {
    if (editMode) return
    window.api.requestAppSettings().then(({ defaultWinePrefix }) => {
      const suggestedWinePrefix = `${defaultWinePrefix}/${title}`
      setWinePrefix(suggestedWinePrefix)
    })
  }, [title, editMode])

  async function searchImage() {
    setSearching(true)

    try {
      const response = await axios.get(
        `https://steamgrid.usebottles.com/api/search/${title}`,
        { timeout: 3500 }
      )

      if (response.status === 200) {
        const steamGridImage = response.data as string

        if (steamGridImage && steamGridImage.startsWith('http')) {
          setImageUrl(steamGridImage)
        }
      } else {
        throw new Error('Fetch failed')
      }
    } catch (error) {
      window.api.logError(`${error}`)
    } finally {
      setSearching(false)
    }
  }

  async function handleInstall(): Promise<void> {
    setAddingApp(true)
    window.api.addNewApp({
      runner: 'sideload',
      app_name,
      title,
      install: {
        executable: selectedExe,
        platform: gameInfo.install?.platform ?? platformToInstall
      },
      art_cover: imageUrl ? imageUrl : fallbackImage,
      is_installed: true,
      art_square: imageUrl ? imageUrl : fallbackImage,
      canRunOffline: true,
      browserUrl: gameUrl,
      customUserAgent,
      launchFullScreen
    })
    const gameSettings = await getGameSettings(app_name, 'sideload')
    if (!gameSettings) {
      return
    }
    if (!editMode)
      window.api.writeConfig({
        appName: app_name,
        config: {
          ...gameSettings,
          winePrefix,
          wineVersion,
          wineCrossoverBottle: crossoverBottle
        }
      })

    await refreshLibrary({
      library: 'sideload',
      runInBackground: true,
      checkForUpdates: true
    })
    setAddingApp(false)
    return backdropClick()
  }

  const fileFilters = {
    Windows: [
      { name: 'Executables', extensions: ['exe', 'msi'] },
      { name: 'Scripts', extensions: ['bat'] },
      { name: 'All', extensions: ['*'] }
    ],
    linux: [
      { name: 'AppImages', extensions: ['AppImage'] },
      { name: 'Other Binaries', extensions: ['sh', 'py', 'bin'] },
      { name: 'All', extensions: ['*'] }
    ],
    Mac: [
      { name: 'Apps', extensions: ['App'] },
      { name: 'Other Binaries', extensions: ['sh', 'py', 'bin'] },
      { name: 'All', extensions: ['*'] }
    ]
  }

  const handleRunExe = async () => {
    let exeToRun = ''
    const path = await window.api.openDialog({
      buttonLabel: t('box.select.button', 'Select'),
      properties: ['openFile'],
      title: t('box.runexe.title', 'Select EXE to Run'),
      filters: fileFilters[appPlatform]
    })
    if (path) {
      exeToRun = path
      try {
        setRunningSetup(true)
        const gameSettings = await getGameSettings(app_name, 'sideload')
        if (!gameSettings) {
          return
        }
        await writeConfig({
          appName: app_name,
          config: { ...gameSettings, winePrefix, wineVersion }
        })
        await window.api.runWineCommand({
          commandParts: [exeToRun],
          wait: true,
          protonVerb: 'runinprefix',
          gameSettings: {
            ...gameSettings,
            winePrefix,
            wineVersion: wineVersion || gameSettings.wineVersion
          }
        })
        setRunningSetup(false)
      } catch (error) {
        console.log('finished with error', error)
        setRunningSetup(false)
      }
    }
    return
  }

  function handleGameUrl(url: string) {
    if (!url.startsWith('https://')) {
      return setGameUrl(`https://${url}`)
    }

    setGameUrl(url)
  }

  function platformIcon() {
    const platformIcon = availablePlatforms.filter(
      (p) => p.name === appPlatform.replace('Mac', 'macOS')
    )[0]?.icon

    return (
      <FontAwesomeIcon
        className="InstallModal__platformIcon"
        icon={platformIcon}
      />
    )
  }

  const showSideloadExe = appPlatform !== 'Browser'

  const shouldShowRunExe =
    !isWindows &&
    appPlatform !== 'Mac' &&
    appPlatform !== 'linux' &&
    appPlatform !== 'Browser'

  return (
    <>
      <DialogContent>
        <div className="sideloadGrid">
          <div className="imageIcons">
            <CachedImage
              className={classNames('appImage', { blackWhiteImage: searching })}
              src={imageUrl ? imageUrl : fallbackImage}
            />
            <span className="titleIcon">
              {title}
              {platformIcon()}
            </span>
          </div>
          <div className="sideloadForm">
            <TextInputField
              label={t('sideload.info.title', 'Game/App Title')}
              placeholder={t(
                'sideload.placeholder.title',
                'Add a title to your Game/App'
              )}
              onChange={(e) => handleTitle(e.target.value)}
              onBlur={async () => searchImage()}
              htmlId="sideload-title"
              value={title}
              maxLength={40}
            />
            <TextInputField
              label={t('sideload.info.image', 'App Image')}
              placeholder={t(
                'sideload.placeholder.image',
                'Paste an Image URL here'
              )}
              onChange={(e) => setImageUrl(e.target.value)}
              htmlId="sideload-image"
              value={imageUrl}
            />
            {!editMode && children}
            {showSideloadExe && (
              <PathSelectionBox
                type="file"
                onPathChange={setSelectedExe}
                path={selectedExe}
                placeholder={t('sideload.info.exe', 'Select Executable')}
                pathDialogTitle={t('box.sideload.exe', 'Select Executable')}
                pathDialogDefaultPath={winePrefix}
                pathDialogFilters={fileFilters[platformToInstall]}
                htmlId="sideload-exe"
                label={t('sideload.info.exe', 'Select Executable')}
                noDeleteButton
              />
            )}
            {!showSideloadExe && (
              <>
                <TextInputField
                  label={t('sideload.info.broser', 'BrowserURL')}
                  placeholder={t(
                    'sideload.placeholder.url',
                    'Paste the Game URL here'
                  )}
                  onChange={(e) => handleGameUrl(e.target.value)}
                  htmlId="sideload-game-url"
                  value={gameUrl}
                />
                <TextInputField
                  label={t('sideload.info.useragent', 'Custom User Agent')}
                  placeholder={t(
                    'sideload.placeholder.useragent',
                    'Write a custom user agent here to be used on this browser app/game'
                  )}
                  onChange={(e) => setCustomUserAgent(e.target.value)}
                  htmlId="sideload-user-agent"
                  value={customUserAgent}
                />
                <ToggleSwitch
                  htmlId="launch-fullscreen"
                  value={launchFullScreen}
                  handleChange={() => setLaunchFullScreen(!launchFullScreen)}
                  title={t(
                    'sideload.info.fullscreen',
                    'Launch Fullscreen (F11 to exit)'
                  )}
                />
              </>
            )}
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        {shouldShowRunExe && (
          <button
            onClick={async () => handleRunExe()}
            className={`button is-secondary`}
            disabled={runningSetup || !title.length}
          >
            {runningSetup
              ? t('button.running-setup', 'Running Setup')
              : t('button.run-exe-first', 'Run Installer First')}
          </button>
        )}
        <button
          onClick={async () => handleInstall()}
          className={`button is-success`}
          disabled={(!selectedExe.length && !gameUrl) || addingApp || searching}
        >
          {addingApp && <FontAwesomeIcon icon={faSpinner} spin />}
          {!addingApp && t('button.finish', 'Finish')}
        </button>
      </DialogFooter>
    </>
  )
}
