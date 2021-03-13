import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import {
  createNewWindow,
  formatStoreUrl,
  repair,
  updateGame,
} from '../../helper'
import ContextProvider from '../../state/ContextProvider'
import { useTranslation } from 'react-i18next'
import { IpcRenderer } from 'electron'

const { ipcRenderer, remote } = window.require('electron')
const {
  dialog: { showMessageBox, showOpenDialog },
} = remote

const renderer: IpcRenderer = ipcRenderer

interface Props {
  appName: string
  isInstalled: boolean
  title: string
  clicked: boolean
}

export default function GamesSubmenu({
  appName,
  isInstalled,
  title,
  clicked,
}: Props) {
  const { handleGameStatus, refresh, gameUpdates } = useContext(ContextProvider)

  const { t, i18n } = useTranslation('gamepage')
  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }

  const protonDBurl = `https://www.protondb.com/search?q=${title}`
  const hasUpdate = gameUpdates.includes(appName)

  async function handleMoveInstall() {
    const { response } = await showMessageBox({
      title: t('box.move.title'),
      message: t('box.move.message'),
      buttons: [t('box.yes'), t('box.no')],
    })
    if (response === 0) {
      const { filePaths } = await showOpenDialog({
        title: t('box.move.path'),
        buttonLabel: t('box.choose'),
        properties: ['openDirectory'],
      })
      if (filePaths[0]) {
        const path = filePaths[0]
        handleGameStatus({ appName, status: 'moving' })
        await renderer.invoke('moveInstall', [appName, path])
        handleGameStatus({ appName, status: 'done' })
      }
      return
    }
    return
  }

  async function handleChangeInstall() {
    const { response } = await showMessageBox({
      title: t('box.change.title'),
      message: t('box.change.message'),
      buttons: [t('box.yes'), t('box.no')],
    })
    if (response === 0) {
      const { filePaths } = await showOpenDialog({
        title: t('box.change.path'),
        buttonLabel: t('box.choose'),
        properties: ['openDirectory'],
      })
      if (filePaths[0]) {
        const path = filePaths[0]
        await renderer.invoke('changeInstallPath', [appName, path])
        await refresh()
      }
      return
    }
    return
  }

  async function handleUpdate() {
    const { response } = await showMessageBox({
      title: t('box.update.title'),
      message: t('box.update.message'),
      buttons: [t('box.yes'), t('box.no')],
    })

    if (response === 0) {
      await handleGameStatus({ appName, status: 'updating' })
      await updateGame(appName)
      return handleGameStatus({ appName, status: 'done' })
    }
    return
  }

  async function handleRepair(appName: string) {
    const { response } = await showMessageBox({
      title: t('box.repair.title'),
      message: t('box.repair.message'),
      buttons: [t('box.yes'), t('box.no')],
    })

    if (response === 1) {
      return
    }

    handleGameStatus({ appName, status: 'repairing' })
    await repair(appName)
    return handleGameStatus({ appName, status: 'done' })
  }

  return (
    <div className={`more ${clicked ? 'clicked' : ''}`}>
      {isInstalled && (
        <>
          <Link
            className="hidden link"
            to={{
              pathname: `/settings/${appName}/wine`,
              state: { fromGameCard: false },
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
        </>
      )}
      <span
        onClick={() => createNewWindow(formatStoreUrl(title, lang))}
        className="hidden link"
      >
        {t('submenu.store')}
      </span>
      <span
        onClick={() => createNewWindow(protonDBurl)}
        className="hidden link"
      >
        {t('submenu.protondb')}
      </span>
    </div>
  )
}
