import { getGameInfo, install } from 'src/helpers'
import React, { useContext, useEffect, useState } from 'react'

import './index.css'
import { CreateNewFolder } from '@material-ui/icons'
import { InstallProgress, Path } from 'src/types'
import { NOT_SUPPORTED_GAMES } from 'src/constants'

import { UpdateComponent } from 'src/components/UI'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'

const {ipcRenderer} = window.require('electron')

type Props = {
  appName: string
  backdropClick: () => void
}

const storage: Storage = window.localStorage

export default function InstallModal({appName, backdropClick}: Props) {
  const notSupported = NOT_SUPPORTED_GAMES.includes(appName)
  const {handleGameStatus} = useContext(ContextProvider)
  const [installPath, setInstallPath] = useState('default')
  const [defaultPath, setDefaultPath] = useState('...')
  const [title, setTitle] = useState('')

  const {t} = useTranslation('gamepage')
  const previousProgress = JSON.parse(storage.getItem(appName) || '{}') as InstallProgress

  function handleInstall(path: string){
    install({
      appName,
      handleGameStatus,
      installPath: path,
      isInstalling: false,
      previousProgress,
      progress: previousProgress,
      t
    })
    backdropClick()
  }

  useEffect(() => {
    const getInfo = async() => {
      const {title} = await getGameInfo(appName)
      setTitle(title)
      const { defaultInstallPath } = await ipcRenderer.invoke('requestSettings', 'default')
      if (installPath === 'default') {
        setInstallPath(defaultInstallPath)
      }
      setDefaultPath(defaultInstallPath.replaceAll("'", ''))
    }
    getInfo()
  }, [appName, defaultPath])

  return (
    <span className="modalContainer">
      {title ?
        <div className="modal">
          <span className="title">{title}</span>
          <span>
            <input
              data-testid="setinstallpath"
              type="text"
              value={installPath.replaceAll("'", '')}
              className="settingSelect"
              placeholder={defaultPath}
              onChange={(event) => setInstallPath(event.target.value)}
            />
            <CreateNewFolder
              data-testid="setinstallpathbutton"
              className="material-icons settings folder"
              onClick={() =>
                ipcRenderer.invoke('openDialog', {
                  buttonLabel: t('box.choose'),
                  properties: ['openDirectory'],
                  title: t('box.default-install-path')
                }).then(({ path }: Path) =>
                  setInstallPath(path ? `'${path}'` : defaultPath)
                )
              }
            />
          </span>
          <div className="buttonsWrapper">
            {!notSupported && <button
              onClick={() => handleInstall(installPath)}
              className={`button is-primary`}
            >
              Install
            </button>}
            <button
              onClick={() => handleInstall('import')}
              className={`button is-tertiary`}
            >
              Import
            </button>
          </div>
        </div>
        : <UpdateComponent />}
      <span className="backdrop" onClick={() => backdropClick()} />
    </span>
  )
}
