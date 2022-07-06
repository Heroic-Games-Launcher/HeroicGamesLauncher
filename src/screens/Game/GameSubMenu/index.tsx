import './index.css'

import React, { useContext, useEffect, useState } from 'react'

import { AppSettings, Runner } from 'src/types'

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
}

type otherInfo = {
  prefix: string
  wine: string
}

export default function GamesSubmenu({
  appName,
  isInstalled,
  title,
  storeUrl,
  runner
}: Props) {
  const { handleGameStatus, refresh, platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'
  const isMac = platform === 'darwin'
  const isLinux = platform === 'linux'
  const [info, setInfo] = useState({ prefix: '', wine: '' } as otherInfo)
  const [isNative, setIsNative] = useState(false)
  const [steamRefresh, setSteamRefresh] = useState<boolean>(false)
  const [addedToSteam, setAddedToSteam] = useState<boolean>(false)
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
    await ipcRenderer.invoke('addToSteam', appName, runner)
    isAddedToSteam()
    setSteamRefresh(false)
  }

  async function handleRemoveFromSteam() {
    setSteamRefresh(true)
    await ipcRenderer.invoke('removeFromSteam', appName, runner)
    isAddedToSteam()
    setSteamRefresh(false)
  }

  const isAddedToSteam = () => {
    ipcRenderer.invoke('isAddedToSteam', appName, runner).then((added) => {
      setAddedToSteam(added)
    })
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
    isAddedToSteam()
  }, [])

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
              <CircularProgress className="link button is-text is-link" />
            ) : !addedToSteam ? (
              <button
                onClick={async () => handleAddToSteam()}
                className="link button is-text is-link"
              >
                {t('submenu.addToSteam', 'Add to Steam')}
              </button>
            ) : (
              <button
                onClick={async () => handleRemoveFromSteam()}
                className="link button is-text is-link"
              >
                {t('submenu.removeFromSteam', 'Remove from Steam')}
              </button>
            )}
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
