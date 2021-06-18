import './index.css'

import React, { useContext } from 'react'

import { IpcRenderer } from 'electron'
import { Link } from 'react-router-dom'
import {
  createNewWindow,
  formatStoreUrl,
  repair,
  updateGame
} from 'src/helpers'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'

const { ipcRenderer } = window.require('electron')

const renderer: IpcRenderer = ipcRenderer

interface Props {
  appName: string
  clicked: boolean
  isInstalled: boolean
  title: string
}

export default function GamesSubmenu({
  appName,
  isInstalled,
  title,
  clicked
}: Props) {
  const { handleGameStatus, refresh, gameUpdates, platform } = useContext(
    ContextProvider
  )
  const isWin = platform === 'win32'

  const { t, i18n } = useTranslation('gamepage')
  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }

  const protonDBurl = `https://www.protondb.com/search?q=${title}`
  const hasUpdate = gameUpdates.includes(appName)

  async function handleMoveInstall() {
    const { response } = await ipcRenderer.invoke('openMessageBox', {
      buttons: [t('box.yes'), t('box.no')],
      message: t('box.move.message'),
      title: t('box.move.title')
    })
    if (response === 0) {
      const { path } = await ipcRenderer.invoke('openDialog',{
        buttonLabel: t('box.choose'),
        properties: ['openDirectory'],
        title: t('box.move.path')
      })
      if (path) {
        await handleGameStatus({ appName, status: 'moving' })
        await renderer.invoke('moveInstall', [appName, path])
        await handleGameStatus({ appName, status: 'done' })
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
      const { path } = await ipcRenderer.invoke('openDialog',{
        buttonLabel: t('box.choose'),
        properties: ['openDirectory'],
        title: t('box.change.path')
      })
      if (path) {
        await renderer.invoke('changeInstallPath', [appName, path])
        await refresh()
      }
      return
    }
    return
  }

  async function handleUpdate() {
    await handleGameStatus({ appName, status: 'updating' })
    await updateGame(appName)
    await handleGameStatus({ appName, status: 'done' })
  }

  async function handleRepair(appName: string) {
    const { response } = await ipcRenderer.invoke('openMessageBox', {
      buttons: [t('box.yes'), t('box.no')],
      message: t('box.repair.message'),
      title: t('box.repair.title')
    })

    if (response === 0) {
      await handleGameStatus({ appName, status: 'repairing' })
      await repair(appName)
      await handleGameStatus({ appName, status: 'done' })
    }
  }

  return (
    <div className={`more ${clicked ? 'clicked' : ''}`}>
      {isInstalled && (
        <>
          <Link
            className="hidden link"
            to={{
              pathname: isWin
                ? `/settings/${appName}/other`
                : `/settings/${appName}/wine`,
              state: { fromGameCard: false }
            }}
          >
            {t('submenu.settings')}
          </Link>
          {hasUpdate && (
            <span onClick={() => handleUpdate()} className="hidden link">
              {t('submenu.update', 'Update Game')}
            </span>
          )}
          <span onClick={() => handleRepair(appName)} className="hidden link">
            {t('submenu.verify')}
          </span>{' '}
          <span onClick={() => handleMoveInstall()} className="hidden link">
            {t('submenu.move')}
          </span>{' '}
          <span onClick={() => handleChangeInstall()} className="hidden link">
            {t('submenu.change')}
          </span>{' '}
          <span
            onClick={() => renderer.send('getLog', appName)}
            className="hidden link"
          >
            {t('submenu.log')}
          </span>
          <span
            onClick={() => ipcRenderer.send('addShortcut', appName)}
            className="hidden link"
          >
            {t('submenu.addShortcut', 'Add shortcut')}
          </span>
        </>
      )}
      <span
        onClick={() => createNewWindow(formatStoreUrl(title, lang))}
        className="hidden link"
      >
        {t('submenu.store')}
      </span>
      {!isWin && <span
        onClick={() => createNewWindow(protonDBurl)}
        className="hidden link"
      >
        {t('submenu.protondb')}
      </span>}
    </div>
  )
}
