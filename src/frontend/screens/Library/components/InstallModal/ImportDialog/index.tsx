import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import {
  GameInfo,
  InstallPlatform,
  Runner,
  WineInstallation
} from 'common/types'
import { PathSelectionBox } from 'frontend/components/UI'
import {
  DialogHeader,
  DialogFooter,
  DialogContent
} from 'frontend/components/UI/Dialog'
import ContextProvider from 'frontend/state/ContextProvider'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { AvailablePlatforms } from '../index'
import { configStore } from 'frontend/helpers/electronStores'

interface Props {
  backdropClick: () => void
  appName: string
  runner: Runner
  platformToInstall: InstallPlatform
  availablePlatforms: AvailablePlatforms
  winePrefix: string
  crossoverBottle: string
  wineVersion: WineInstallation | undefined
  children: React.ReactNode
  gameInfo: GameInfo
}

const userHome = configStore.get('userHome', '')

function getDefaultInstallPath() {
  const { defaultInstallPath = `${userHome}/Games/Heroic` } = {
    ...configStore.get_nodefault('settings')
  }
  return defaultInstallPath
}

export default function ImportDialog({
  backdropClick,
  appName,
  runner,
  platformToInstall,
  availablePlatforms,
  winePrefix,
  wineVersion,
  crossoverBottle,
  children,
  gameInfo
}: Props) {
  const { libraryStatus } = useContext(ContextProvider)
  const { t } = useTranslation('gamepage')

  const [importPath, setImportPath] = React.useState('')

  const title = gameInfo?.title
  const isImportingThisGame = libraryStatus.some(
    (game) => game.appName === appName && game.status === 'importing'
  )

  const pickFile = platformToInstall === 'Mac'

  async function handleImport() {
    if (!importPath) return

    backdropClick()

    await window.api.importGame({
      appName,
      path: importPath,
      runner,
      platform: platformToInstall,
      winePrefix,
      wineVersion,
      wineCrossoverBottle: crossoverBottle
    })
  }

  return (
    <>
      <DialogHeader onClose={backdropClick}>
        {title ? title : '...'}
        {availablePlatforms.map((p) => (
          <FontAwesomeIcon
            className="InstallModal__platformIcon"
            icon={p.icon}
            key={p.value}
          />
        ))}
      </DialogHeader>
      <DialogContent>
        <PathSelectionBox
          type={pickFile ? 'file' : 'directory'}
          onPathChange={setImportPath}
          path={importPath}
          placeholder={getDefaultInstallPath()}
          pathDialogTitle={t('box.importpath', 'Select Folder to Import')}
          pathDialogDefaultPath={getDefaultInstallPath()}
          htmlId="setimportpath"
          label={t('install.path', 'Select Install Path')}
          noDeleteButton
        />
        {children}
      </DialogContent>
      <DialogFooter>
        <button
          onClick={handleImport}
          className="button is-primary"
          disabled={!importPath || isImportingThisGame}
        >
          {isImportingThisGame ? (
            <FontAwesomeIcon className="fa-spin-pulse" icon={faSpinner} />
          ) : null}
          {t('button.import', 'Import')}
        </button>
      </DialogFooter>
    </>
  )
}
