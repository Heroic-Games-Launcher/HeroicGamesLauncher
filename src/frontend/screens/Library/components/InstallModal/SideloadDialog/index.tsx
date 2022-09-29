import short from 'short-uuid'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { InstallPlatform, WineInstallation } from 'common/types'
import { TextInputField, TextInputWithIconField } from 'frontend/components/UI'
import {
  DialogContent,
  DialogFooter,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import { getAppSettings, getGameSettings, writeConfig } from 'frontend/helpers'
import { Path } from 'frontend/types'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AvailablePlatforms } from '..'

type Props = {
  availablePlatforms: AvailablePlatforms
  winePrefix: string
  wineVersion: WineInstallation | undefined
  setWinePrefix: React.Dispatch<React.SetStateAction<string>>
  children: React.ReactNode
  platformToInstall: InstallPlatform
  backdropClick: () => void
}

export default function SideloadDialog({
  availablePlatforms,
  backdropClick,
  winePrefix,
  wineVersion,
  platformToInstall,
  setWinePrefix,
  children
}: Props) {
  const { t } = useTranslation('gamepage')
  const [title, setTitle] = useState<string | never>(
    t('sideload.field.title', 'Title')
  )
  const [selectedExe, setSelectedExe] = useState('')
  const [app_name, setApp_name] = useState('')
  const [runningSetup, setRunningSetup] = useState(false)

  useEffect(() => {
    setApp_name(short.generate().toString())
  }, [])

  useEffect(() => {
    const setWine = async () => {
      const { defaultWinePrefix } = await getAppSettings()
      const sugestedWinePrefix = `${defaultWinePrefix}/${title}`
      setWinePrefix(sugestedWinePrefix)
    }
    setWine()
  }, [title])

  function handleInstall(): void | PromiseLike<void> {
    window.api.addNewApp({
      runner: 'sideload',
      app_name,
      title,
      install: {
        executable: selectedExe,
        platform: platformToInstall
      },
      art_cover: 'fallback',
      is_installed: true,
      art_square: 'fallback'
    })
    writeConfig([app_name, { winePrefix, wineVersion }])
    return backdropClick()
  }

  const handleRunExe = async () => {
    let exeToRun = ''
    const { path } = await window.api.openDialog({
      buttonLabel: t('box.select.button', 'Select'),
      properties: ['openFile'],
      title: t('box.runexe.title')
    })
    if (path) {
      exeToRun = path
      console.log(exeToRun)
      try {
        setRunningSetup(true)
        await writeConfig([app_name, { winePrefix, wineVersion }])
        const gameSettings = await getGameSettings(app_name, 'sideload')
        console.log({ gameSettings, app_name })
        await window.api.runWineCommand({
          command: exeToRun,
          wait: true,
          forceRunInPrefixVerb: true,
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

  return (
    <>
      <DialogHeader onClose={backdropClick} showCloseButton={!runningSetup}>
        {title}
        {availablePlatforms.map((p) => (
          <FontAwesomeIcon
            className="InstallModal__platformIcon"
            icon={p.icon}
            key={p.value}
          />
        ))}
      </DialogHeader>
      <DialogContent>
        <TextInputField
          label={t('sideload.info.title', 'Game/App Title')}
          placeholder={t(
            'sideload.placeholder.title',
            'Add a title to your Game/App'
          )}
          onChange={(e) => setTitle(e.target.value)}
          htmlId="sideload-title"
          value={title}
        />
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
                title: t('box.sideload.exe', 'Select Executable')
              })
              .then(({ path }: Path) => setSelectedExe(path ? path : ''))
          }
        />
        {children}
      </DialogContent>
      <DialogFooter>
        <button
          onClick={async () => handleRunExe()}
          className={`button is-secondary`}
          disabled={runningSetup}
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
