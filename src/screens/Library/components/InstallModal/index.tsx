import { getInstallInfo, install } from 'src/helpers'
import React, { useContext, useEffect, useState } from 'react'

import './index.css'
import { InstallInfo, InstallProgress } from 'src/types'

import { UpdateComponent } from 'src/components/UI'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'

import { SDL_GAMES, SelectiveDownload } from './selective_dl'
import prettyBytes from 'pretty-bytes'
import { Checkbox } from '@material-ui/core'

type Props = {
  appName: string
  backdropClick: () => void
}

const storage: Storage = window.localStorage

export default function InstallModal({ appName, backdropClick }: Props) {
  const { handleGameStatus } = useContext(ContextProvider)
  const [gameInfo, setGameInfo] = useState({} as InstallInfo)
  const [installDlcs, setInstallDlcs] = useState(false)

  const haveSDL = Boolean(SDL_GAMES[appName])
  const mandatoryTags: Array<string> = haveSDL
    ? SDL_GAMES[appName]
      .filter((el: SelectiveDownload) => el.mandatory)
      .map((el: SelectiveDownload) => el.tags)[0]
    : []
  const [sdlList, setSdlList] = useState([...mandatoryTags])

  const { t } = useTranslation('gamepage')
  const previousProgress = JSON.parse(
    storage.getItem(appName) || '{}'
  ) as InstallProgress

  async function handleInstall(path: string) {
    backdropClick()
    return await install({
      appName,
      handleGameStatus,
      installPath: path,
      isInstalling: false,
      previousProgress,
      progress: previousProgress,
      t,
      sdlList,
      installDlcs
    })
  }

  function handleSdl(tags: Array<string>) {
    let updatedList: Array<string> = [...sdlList]
    tags.forEach((tag) => {
      if (updatedList.includes(tag)) {
        return (updatedList = updatedList.filter((tagx) => {
          return tagx !== tag
        }))
      }
      return updatedList.push(tag)
    })
    setSdlList([...updatedList])
  }

  function handleDlcs() {
    setInstallDlcs(!installDlcs)
  }

  useEffect(() => {
    const getInfo = async () => {
      const gameInfo = await getInstallInfo(appName)
      setGameInfo(gameInfo)
    }
    getInfo()
  }, [appName])

  const haveDLCs = gameInfo?.game?.owned_dlc?.length > 0
  const DLCList = gameInfo?.game?.owned_dlc
  const downloadSize =
    gameInfo?.manifest?.download_size &&
    prettyBytes(Number(gameInfo?.manifest?.download_size))
  const installSize =
    gameInfo?.manifest?.disk_size &&
    prettyBytes(Number(gameInfo?.manifest?.disk_size))

  return (
    <span className="modalContainer">
      {gameInfo?.game?.title ? (
        <div className="modal">
          <span className="title">{gameInfo?.game?.title}</span>
          <div className="installInfo">
            <div className="itemContainer">
              <span className="item">
                <span className="sizeInfo">
                  {t('game.downloadSize', 'Download Size')}:
                </span>{' '}
                <span>{downloadSize}</span>
              </span>
              <span className="item">
                <span className="sizeInfo">
                  {t('game.installSize', 'Install Size')}:
                </span>{' '}
                <span>{installSize}</span>
              </span>
            </div>
            {haveDLCs && (
              <div className="itemContainer">
                <div className="itemTitle">{t('dlc.title', 'DLCs')}</div>
                {DLCList.map(({ app_name, title }) => (
                  <span key={app_name} className="itemName">
                    {title}
                  </span>
                ))}
                <span className="item">
                  <Checkbox
                    color="primary"
                    checked={installDlcs}
                    size="small"
                    onChange={() => handleDlcs()}
                  />
                  <span>{t('dlc.installDlcs', 'Install all DLCs')}</span>
                </span>
              </div>
            )}
            {haveSDL && (
              <div className="itemContainer">
                <p className="itemTitle">
                  {t('sdl.title', 'Select components to Install')}
                </p>
                {SDL_GAMES[appName].map(
                  ({ name, tags, mandatory }: SelectiveDownload) =>
                    !mandatory && (
                      <span key={name} className="item">
                        <Checkbox
                          color="primary"
                          checked={mandatory}
                          disabled={mandatory}
                          size="small"
                          onChange={() => handleSdl(tags)}
                        />
                        <span>{name}</span>
                      </span>
                    )
                )}
              </div>
            )}
          </div>
          <div className="buttonsContainer">
            <button
              onClick={() => handleInstall('import')}
              className={`button is-tertiary outline`}
            >
              {t('button.import')}
            </button>
            <button
              onClick={() => handleInstall('another')}
              className={`button is-tertiary`}
            >
              {t('button.install')}
            </button>
          </div>
        </div>
      ) : (
        <UpdateComponent />
      )}
      <span className="backdrop" onClick={() => backdropClick()} />
    </span>
  )
}
