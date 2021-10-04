import { getGameInfo, install } from 'src/helpers'
import React, { useContext, useEffect, useState } from 'react'

import './index.css'
import { InstallProgress } from 'src/types'

import { UpdateComponent } from 'src/components/UI'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'

import {SDL_GAMES, SelectiveDownload} from './selective_dl'

type Props = {
  appName: string
  backdropClick: () => void
}

const storage: Storage = window.localStorage

export default function InstallModal({appName, backdropClick}: Props) {
  const {handleGameStatus} = useContext(ContextProvider)
  const [title, setTitle] = useState('')
  const [sdlList, setSdlList] = useState([] as Array<string>)
  const haveSDL = Boolean(SDL_GAMES[appName])

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
      t,
      sdlList
    })
  }

  function handleSdl(tags: Array<string>){
    let updatedList: Array<string> = [...sdlList]
    tags.forEach(tag => {
      if (updatedList.includes(tag)){
        return updatedList = updatedList.filter((tagx) => {
          return tagx !== tag})
      }
      return updatedList.push(tag)
    })
    setSdlList([...updatedList])
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
          {haveSDL && <div className="sdlContainer">
            <p className="sdlTitle" >{t('sdl.title', 'Select components to Install')}</p>
            {SDL_GAMES[appName].map(({name, tags}: SelectiveDownload) => {
              return (
                <span key={name} className="sdlItem">
                  <span className="sdlName">{name}</span><input type='checkbox' onChange={() => handleSdl(tags)}/>
                </span>)
            }
            )}
          </div>}
          <div className="buttonsContainer">
            <button
              onClick={() => handleInstall('another')}
              className={`button is-primary`}
            >
              {t('button.install')}
            </button>
            <button
              onClick={() => handleInstall('import')}
              className={`button is-tertiary`}
            >
              {t('button.import')}
            </button>
          </div>
        </div>
        : <UpdateComponent />}
      <span className="backdrop" onClick={() => backdropClick()} />
    </span>
  )
}
