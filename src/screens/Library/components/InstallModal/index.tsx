import { getGameInfo, install } from 'src/helpers'
import React, { useContext, useEffect, useState } from 'react'

import './index.css'
import { InstallProgress } from 'src/types'
import { NOT_SUPPORTED_GAMES } from 'src/constants'

import { UpdateComponent } from 'src/components/UI'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'

type Props = {
  appName: string
  backdropClick: () => void
}

const storage: Storage = window.localStorage

export default function InstallModal({appName, backdropClick}: Props) {
  const notSupported = NOT_SUPPORTED_GAMES.includes(appName)
  const {handleGameStatus} = useContext(ContextProvider)
  const [title, setTitle] = useState('')

  const {t} = useTranslation('gamepage')
  const previousProgress = JSON.parse(storage.getItem(appName) || '{}') as InstallProgress

  async function handleInstall(path: string){
    backdropClick()
    return await install({
      appName,
      handleGameStatus,
      installPath: path,
      isInstalling: false,
      previousProgress,
      progress: previousProgress,
      t
    })
  }

  useEffect(() => {
    const getInfo = async() => {
      const {title} = await getGameInfo(appName)
      setTitle(title)
    }
    getInfo()
  }, [appName])

  return (
    <span className="modalContainer">
      {title ?
        <div className="modal">
          <span className="title">{title}</span>
          <div className="buttonsContainer">
            {!notSupported && <button
              onClick={() => handleInstall('another')}
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
