import './index.css'

import React, { useContext, useEffect, useState } from 'react'

import { AppSettings, GameSettings, GameStatus, Runner } from 'src/types'

import { SmallInfo } from 'src/components/UI'
import { createNewWindow, getGameInfo, repair } from 'src/helpers'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import { uninstall } from 'src/helpers/library'
import { NavLink } from 'react-router-dom'

import { ipcRenderer } from 'src/helpers'
import { CircularProgress } from '@mui/material'

interface Props {
  appName: string
  isInstalled: boolean
  title: string
  storeUrl: string
  runner: Runner
  handleUpdate: () => void
  disableUpdate: boolean
  steamImageUrl: string
}

type otherInfo = {
  prefix: string
  wine: string
}

const imageData = async (
  src: string,
  cw: number,
  ch: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('CANVAS') as HTMLCanvasElement
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

    const img = document.createElement('IMG') as HTMLImageElement
    img.crossOrigin = 'anonymous'

    img.addEventListener(
      'load',
      function () {
        canvas.width = cw
        canvas.height = ch

        const imgWidth = img.width
        const imgHeight = img.height

        const bkgW = cw
        const bkgH = (imgHeight * cw) / imgWidth
        const bkgX = 0
        const bkgY = ch / 2 - bkgH / 2
        ctx.filter = 'blur(10px)'
        ctx.drawImage(img, bkgX, bkgY, bkgW, bkgH)

        const drawH = ch
        const drawW = (imgWidth * ch) / imgHeight
        const drawY = 0
        const drawX = cw / 2 - drawW / 2
        ctx.filter = 'blur(0)'
        ctx.drawImage(img, drawX, drawY, drawW, drawH)
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      },
      false
    )

    img.addEventListener('error', (error) => {
      reject(error)
    })

    img.src = src
  })
}

export default function GamesSubmenu({
  appName,
  isInstalled,
  title,
  storeUrl,
  runner,
  handleUpdate,
  disableUpdate,
  steamImageUrl
}: Props) {
  const { handleGameStatus, refresh, platform, libraryStatus } =
    useContext(ContextProvider)
  const isWin = platform === 'win32'
  const isMac = platform === 'darwin'
  const isLinux = platform === 'linux'
  const [info, setInfo] = useState({ prefix: '', wine: '' } as otherInfo)
  const [isNative, setIsNative] = useState(false)
  const [steamRefresh, setSteamRefresh] = useState<boolean>(false)
  const [addedToSteam, setAddedToSteam] = useState<boolean>(false)
  const [eosOverlayEnabled, setEosOverlayEnabled] = useState(false)
  const [eosOverlayRefresh, setEosOverlayRefresh] = useState(false)
  const eosOverlayAppName = '98bc04bc842e4906993fd6d6644ffb8d'
  const { t } = useTranslation('gamepage')

  const protonDBurl = `https://www.protondb.com/search?q=${title}`

  async function handleMoveInstall() {
    const { response } = await ipcRenderer.invoke('openMessageBox', {
      buttons: [t('box.yes'), t('box.no')],
      message: t('box.move.message'),
      title: t('box.move.title')
    })
    if (response === 0) {
      const { defaultInstallPath }: AppSettings = await ipcRenderer.invoke(
        'requestSettings',
        'default'
      )
      const { path } = await ipcRenderer.invoke('openDialog', {
        buttonLabel: t('box.choose'),
        properties: ['openDirectory'],
        title: t('box.move.path'),
        defaultPath: defaultInstallPath
      })
      if (path) {
        await handleGameStatus({ appName, runner, status: 'moving' })
        await ipcRenderer.invoke('moveInstall', [appName, path, runner])
        await handleGameStatus({ appName, runner, status: 'done' })
      }
    }
  }

  async function handleChangeInstall() {
    const { response } = await ipcRenderer.invoke('openMessageBox', {
      buttons: [t('box.yes'), t('box.no')],
      message: t('box.change.message'),
      title: t('box.change.title')
    })
    if (response === 0) {
      const { defaultInstallPath }: AppSettings = await ipcRenderer.invoke(
        'requestSettings',
        'default'
      )
      const { path } = await ipcRenderer.invoke('openDialog', {
        buttonLabel: t('box.choose'),
        properties: ['openDirectory'],
        title: t('box.change.path'),
        defaultPath: defaultInstallPath
      })
      if (path) {
        await ipcRenderer.invoke('changeInstallPath', [appName, path, runner])
        await refresh(runner)
      }
      return
    }
    return
  }

  async function handleRepair(appName: string) {
    const { response } = await ipcRenderer.invoke('openMessageBox', {
      buttons: [t('box.yes'), t('box.no')],
      message: t('box.repair.message'),
      title: t('box.repair.title')
    })

    if (response === 0) {
      await handleGameStatus({ appName, runner, status: 'repairing' })
      await repair(appName, runner)
      await handleGameStatus({ appName, runner, status: 'done' })
    }
  }

  function handleShortcuts() {
    ipcRenderer.send('addShortcut', appName, runner, true)
  }

  async function handleAddToSteam() {
    setSteamRefresh(true)
    if (addedToSteam) {
      await ipcRenderer.invoke('removeFromSteam', appName, runner)
    } else {
      const bkgDataURL = await imageData(steamImageUrl, 1920, 620)
      const bigPicDataURL = await imageData(steamImageUrl, 920, 430)

      await ipcRenderer.invoke(
        'addToSteam',
        appName,
        runner,
        bkgDataURL,
        bigPicDataURL
      )
    }
    setAddedToSteam(!addedToSteam)
    setSteamRefresh(false)
  }

  useEffect(() => {
    if (isWin) {
      return
    }
    const getWineInfo = async () => {
      try {
        const { wineVersion, winePrefix }: AppSettings =
          await ipcRenderer.invoke('requestSettings', appName)
        let wine = wineVersion.name
          .replace('Wine - ', '')
          .replace('Proton - ', '')
        if (wine.includes('Default')) {
          wine = wine.split('-')[0]
        }
        setInfo({ prefix: winePrefix, wine })
      } catch (error) {
        ipcRenderer.send('logError', error)
      }
    }
    const getGameDetails = async () => {
      const gameInfo = await getGameInfo(appName, runner)
      const isLinuxNative = gameInfo.install?.platform === 'linux' && isLinux
      setIsNative(isLinuxNative)
    }
    getWineInfo()
    getGameDetails()

    ipcRenderer.invoke('isAddedToSteam', appName, runner).then((added) => {
      setAddedToSteam(added)
    })

    ipcRenderer
      .invoke('requestSettings', appName)
      .then(async (response: GameSettings | AppSettings) => {
        console.log(response)
        const enabled = await ipcRenderer.invoke(
          'isEosOverlayEnabled',
          response.winePrefix
        )
        setEosOverlayEnabled(enabled)
      })
  }, [])

  useEffect(() => {
    const { status } =
      libraryStatus.filter(
        (game: GameStatus) => game.appName === eosOverlayAppName
      )[0] || {}
    setEosOverlayRefresh(status === 'installing')
  }, [eosOverlayRefresh])

  async function handleEosOverlay() {
    const { winePrefix, wineVersion } = await ipcRenderer.invoke(
      'requestSettings',
      appName
    )
    const actualPrefix =
      wineVersion.type === 'proton' ? `${winePrefix}/pfx` : winePrefix

    if (eosOverlayEnabled) {
      await ipcRenderer.invoke('disableEosOverlay', actualPrefix)
      setEosOverlayEnabled(false)
    } else {
      const initialEnableResult = await ipcRenderer.invoke(
        'enableEosOverlay',
        actualPrefix
      )
      const { installNow } = initialEnableResult
      let { wasEnabled } = initialEnableResult

      if (installNow) {
        await handleGameStatus({
          appName: eosOverlayAppName,
          runner: 'legendary',
          status: 'installing'
        })
        setEosOverlayRefresh(true)
        await ipcRenderer.invoke('installEosOverlay')
        await handleGameStatus({
          appName: eosOverlayAppName,
          runner: 'legendary',
          status: 'done'
        })
        setEosOverlayRefresh(false)
        wasEnabled = (
          await ipcRenderer.invoke('enableEosOverlay', actualPrefix)
        ).wasEnabled
      }

      setEosOverlayEnabled(wasEnabled)
    }
  }

  const refreshCircle = () => {
    return <CircularProgress className="link button is-text is-link" />
  }

  return (
    <div className="gameTools subMenuContainer">
      <div className={`submenu`}>
        {isInstalled && (
          <>
            <NavLink
              to={`/settings/${appName}/log`}
              state={{
                fromGameCard: false,
                runner,
                isLinuxNative: isNative,
                isMacNative: isNative
              }}
              className="link button is-text is-link"
            >
              {t('submenu.log')}
            </NavLink>
            <button
              onClick={async () => handleMoveInstall()}
              className="link button is-text is-link"
            >
              {t('submenu.move')}
            </button>{' '}
            <button
              onClick={async () => handleUpdate()}
              className="link button is-text is-link"
              disabled={disableUpdate}
            >
              {t('button.force_update', 'Force Update if Available')}
            </button>{' '}
            <button
              onClick={async () => handleChangeInstall()}
              className="link button is-text is-link"
            >
              {t('submenu.change')}
            </button>{' '}
            <button
              onClick={async () => handleRepair(appName)}
              className="link button is-text is-link"
            >
              {t('submenu.verify')}
            </button>{' '}
            <button
              onClick={async () =>
                uninstall({ appName, t, handleGameStatus, runner })
              }
              className="link button is-text is-link"
            >
              {t('button.uninstall')}
            </button>{' '}
            {!isMac && (
              <button
                onClick={() => handleShortcuts()}
                className="link button is-text is-link"
              >
                {t('submenu.addShortcut', 'Add shortcut')}
              </button>
            )}
            {steamRefresh ? (
              refreshCircle()
            ) : (
              <button
                onClick={async () => handleAddToSteam()}
                className="link button is-text is-link"
              >
                {addedToSteam
                  ? t('submenu.removeFromSteam', 'Remove from Steam')
                  : t('submenu.addToSteam', 'Add to Steam')}
              </button>
            )}
            {isLinux &&
              (eosOverlayRefresh ? (
                refreshCircle()
              ) : (
                <button
                  className="link button is-text is-link"
                  onClick={handleEosOverlay}
                >
                  {eosOverlayEnabled
                    ? t('submenu.disableEosOverlay', 'Disable EOS Overlay')
                    : t('submenu.enableEosOverlay', 'Enable EOS Overlay')}
                </button>
              ))}
          </>
        )}
        <NavLink
          className="link button is-text is-link"
          to={`/store-page?store-url=${storeUrl}`}
        >
          {t('submenu.store')}
        </NavLink>
        {!isWin && (
          <button
            onClick={() => createNewWindow(protonDBurl)}
            className="link button is-text is-link"
          >
            {t('submenu.protondb')}
          </button>
        )}
      </div>
      {isInstalled && isLinux && !isNative && (
        <div className="otherInfo">
          <SmallInfo title="Wine:" subtitle={info.wine} />
          <SmallInfo
            title="Prefix:"
            subtitle={info.prefix}
            handleclick={() => ipcRenderer.send('openFolder', info.prefix)}
          />
        </div>
      )}
    </div>
  )
}
