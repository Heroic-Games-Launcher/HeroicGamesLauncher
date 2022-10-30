import short from 'short-uuid'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { GameInfo, InstallPlatform, WineInstallation } from 'common/types'
import {
  CachedImage,
  TextInputField,
  TextInputWithIconField
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

type Props = {
  availablePlatforms: AvailablePlatforms
  winePrefix: string
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
  wineVersion,
  platformToInstall,
  setWinePrefix,
  children,
  appName
}: Props) {
  const { t } = useTranslation('gamepage')
  const [title, setTitle] = useState<string | never>(
    t('sideload.field.title', 'Title')
  )
  const [selectedExe, setSelectedExe] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [app_name, setApp_name] = useState(appName ?? '')
  const [runningSetup, setRunningSetup] = useState(false)
  const [gameInfo, setGameInfo] = useState<Partial<GameInfo>>({})
  const editMode = Boolean(appName)

  const { refreshLibrary } = useContext(ContextProvider)

  function handleTitle(value: string) {
    value = removeSpecialcharacters(value)
    setTitle(value)
  }

  useEffect(() => {
    if (appName) {
      getGameInfo(appName, 'sideload').then((info) => {
        if (!info) {
          return
        }
        setGameInfo(info)
        const {
          art_cover,
          art_square,
          install: { executable, platform },
          title
        } = info

        if (executable && platform) {
          setSelectedExe(executable)
        }

        setTitle(title)
        setImageUrl(art_cover ? art_cover : art_square)
      })
    } else {
      setApp_name(short.generate().toString())
    }
  }, [])

  useEffect(() => {
    const setWine = async () => {
      if (editMode && appName) {
        const appSettings = await window.api.getGameSettings(
          appName,
          'sideload'
        )
        if (appSettings?.winePrefix) {
          setWinePrefix(appSettings.winePrefix)
        }
        return
      } else {
        const { defaultWinePrefix } = await window.api.requestAppSettings()
        const sugestedWinePrefix = `${defaultWinePrefix}/${title}`
        setWinePrefix(sugestedWinePrefix)
      }
    }
    setWine()
  }, [title])

  useEffect(() => {
    setTimeout(async () => {
      try {
        const res = await fetch(
          `https://steamgrid.usebottles.com/api/search/${title}`
        )
        if (res.status === 200) {
          const steamGridImage = (await res.json()) as string
          setImageUrl(steamGridImage)
        }
      } catch (error) {
        console.log('Error when getting image from SteamGridDB')
      }
    }, 2000)
  }, [title])

  async function handleInstall(): Promise<void> {
    window.api.addNewApp({
      runner: 'sideload',
      app_name,
      title,
      install: {
        executable: selectedExe,
        platform: gameInfo.install?.platform ?? platformToInstall
      },
      art_cover: imageUrl,
      is_installed: true,
      art_square: imageUrl,
      canRunOffline: true
    })
    const gameSettings = await getGameSettings(app_name, 'sideload')
    if (!gameSettings) {
      return
    }
    await writeConfig({
      appName: app_name,
      config: {
        ...gameSettings,
        winePrefix,
        // @ts-expect-error: Issue here is that wineVersion might not be necessary for native games
        //                   Ideally we'd solve this by having a base `GameSettings` interface with
        //                   two children (`NativeGameSettings` and `NonNativeGameSettings`?), one with
        //                   a wineVersion property of type `WineInstallation`, the other with one of
        //                   type `undefined`
        wineVersion
      }
    })

    await refreshLibrary({
      runInBackground: true,
      checkForUpdates: true,
      fullRefresh: true
    })
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
      filters: fileFilters[platformToInstall]
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
          // @ts-expect-error See other ts-expect-error above
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

  const platformIcon = availablePlatforms.filter(
    (p) => p.name === platformToInstall
  )[0]?.icon

  return (
    <>
      <DialogContent>
        <div className="sideloadGrid">
          <div className="imageIcons">
            <CachedImage
              className="appImage"
              src={imageUrl ? imageUrl : fallbackImage}
            />
            <span className="titleIcon">
              {title}
              <FontAwesomeIcon
                className="InstallModal__platformIcon"
                icon={platformIcon}
              />
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
            <TextInputWithIconField
              htmlId="sideload-exe"
              label={t('sideload.info.exe', 'Select Executable')}
              onChange={(e) => setSelectedExe(e.target.value)}
              icon={<FontAwesomeIcon icon={faFolderOpen} />}
              value={selectedExe}
              placeholder={t('sideload.info.exe', 'Select Executable')}
              onIconClick={async () =>
                window.api
                  .openDialog({
                    buttonLabel: t('box.select.button', 'Select'),
                    properties: ['openFile'],
                    title: t('box.sideload.exe', 'Select Executable'),
                    filters: fileFilters[platformToInstall],
                    defaultPath: winePrefix
                  })
                  .then((path) => setSelectedExe(path ? path : ''))
              }
            />
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <button
          onClick={async () => handleRunExe()}
          className={`button is-secondary`}
          disabled={runningSetup || !title.length}
        >
          {runningSetup
            ? t('button.running-setup', 'Running Setup')
            : t('button.run-exe-first', 'Run Installer First')}
        </button>
        <button
          onClick={async () => handleInstall()}
          className={`button is-primary`}
          disabled={!selectedExe.length}
        >
          {t('button.finish', 'Finish')}
        </button>
      </DialogFooter>
    </>
  )
}
