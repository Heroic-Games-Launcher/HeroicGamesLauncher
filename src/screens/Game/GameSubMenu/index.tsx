import './index.css'

import React, { useContext, useEffect, useState } from 'react'

import { AppSettings } from 'src/types'
import { IpcRenderer } from 'electron'
import { SmallInfo } from 'src/components/UI'
import { createNewWindow, formatStoreUrl, repair } from 'src/helpers'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import { uninstall } from 'src/helpers/library'

const { ipcRenderer } = window.require('electron')

const renderer: IpcRenderer = ipcRenderer

interface Props {
  appName: string
  isInstalled: boolean
  title: string
  storeUrl: string
}

type otherInfo = {
  prefix: string
  wine: string
}

export default function GamesSubmenu({
  appName,
  isInstalled,
  title,
  storeUrl
}: Props) {
  const { handleGameStatus, refresh, platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'
  const isMac = platform === 'darwin'
  const isLinux = platform === 'linux'
  const [info, setInfo] = useState({ prefix: '', wine: '' } as otherInfo)

  const { t, i18n } = useTranslation('gamepage')
  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }

  const protonDBurl = `https://www.protondb.com/search?q=${title}`

  async function handleMoveInstall() {
    const { response } = await ipcRenderer.invoke('openMessageBox', {
      buttons: [t('box.yes'), t('box.no')],
      message: t('box.move.message'),
      title: t('box.move.title')
    })
    if (response === 0) {
      const { path } = await ipcRenderer.invoke('openDialog', {
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
      const { path } = await ipcRenderer.invoke('openDialog', {
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

  function handleShortcuts() {
    ipcRenderer.send('addShortcut', appName, true)
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
    getWineInfo()
  }, [appName])

  return (
    <div className="gameTools subMenuContainer">
      <div className={`submenu`}>
        {isInstalled && (
          <>
            <button
              onClick={() => renderer.send('getLog', appName)}
              className="link button is-text is-link"
            >
              {t('submenu.log')}
            </button>
            <button
              onClick={() => handleMoveInstall()}
              className="link button is-text is-link"
            >
              {t('submenu.move')}
            </button>{' '}
            <button
              onClick={() => handleChangeInstall()}
              className="link button is-text is-link"
            >
              {t('submenu.change')}
            </button>{' '}
            <button
              onClick={() => handleRepair(appName)}
              className="link button is-text is-link"
            >
              {t('submenu.verify')}
            </button>{' '}
            <button
              onClick={() => uninstall({ appName, t, handleGameStatus })}
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
          </>
        )}
        <button
          onClick={() =>
            createNewWindow(storeUrl || formatStoreUrl(title, lang))
          }
          className="link button is-text is-link"
        >
          {t('submenu.store')}
        </button>
        {!isWin && (
          <button
            onClick={() => createNewWindow(protonDBurl)}
            className="link button is-text is-link"
          >
            {t('submenu.protondb')}
          </button>
        )}
      </div>
      {isInstalled && isLinux && (
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
