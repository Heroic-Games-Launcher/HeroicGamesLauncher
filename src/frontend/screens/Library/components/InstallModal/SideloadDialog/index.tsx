import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { WineInstallation } from 'common/types'
import { TextInputField, TextInputWithIconField } from 'frontend/components/UI'
import {
  DialogContent,
  DialogFooter,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import { Path } from 'frontend/types'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AvailablePlatforms } from '..'

type Props = {
  availablePlatforms: AvailablePlatforms
  winePrefix: string
  wineVersion: WineInstallation | undefined
  hasWine: boolean
  children: React.ReactNode
  backdropClick: () => void
}

export default function SideloadDialog({
  availablePlatforms,
  backdropClick,
  winePrefix,
  wineVersion,

  children
}: Props) {
  console.log({
    winePrefix,
    wineVersion
  })

  const { t } = useTranslation('gamepage')
  const [title, setTitle] = useState<string | never>(t('game.title', 'Title'))
  const [selectedExe, setSelectedExe] = useState('')

  function handleInstall(): void | PromiseLike<void> {
    throw new Error('Function not implemented.')
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
    }
    return
  }

  return (
    <>
      <DialogHeader onClose={backdropClick} showCloseButton={true}>
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
        >
          {t('button.run-exe-first', 'Run Installer First')}
        </button>
        <button
          onClick={async () => handleInstall()}
          className={`button is-primary`}
        >
          {t('button.finish', 'Finish')}
        </button>
      </DialogFooter>
    </>
  )
}
