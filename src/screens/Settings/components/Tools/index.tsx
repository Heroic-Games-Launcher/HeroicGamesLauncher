import './index.css'

import React, { useState } from 'react'

import { IpcRenderer } from 'electron'
import { WineInstallation } from 'src/types'
import { useTranslation } from 'react-i18next'

const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}

interface Props {
  winePrefix: string
  wineVersion: WineInstallation
}

export default function Tools({ wineVersion, winePrefix }: Props) {
  const { t } = useTranslation()
  const [winecfgRunning, setWinecfgRunning] = useState(false)
  const [winetricksRunning, setWinetricksRunning] = useState(false)

  type Tool = 'winecfg' | 'winetricks' | string
  async function callTools(tool: Tool, exe?: string) {
    if (tool === 'winetricks') {
      setWinetricksRunning(true)
    }
    if (tool === 'winecfg') {
      setWinecfgRunning(true)
    }

    await ipcRenderer.invoke('callTool', {
      exe,
      prefix: winePrefix,
      tool,
      wine: wineVersion.bin
    })
    setWinetricksRunning(false)
    setWinecfgRunning(false)
  }

  const handleRunExe = async () => {
    let exe = ''
    const { path } = await ipcRenderer.invoke('openDialog', {
      buttonLabel: t('box.select.button', 'Select'),
      properties: ['openFile'],
      title: t('box.runexe.title')
    })
    if (path) {
      exe = path
      return callTools('runExe', exe)
    }
    return
  }

  function dropHandler(ev: React.DragEvent<HTMLSpanElement>) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault()

    if (ev.dataTransfer.items) {
      // Use DataTransferItemList interface to access the file(s)
      // If dropped items aren't files, reject them
      if (ev.dataTransfer.items[0].kind === 'file') {
        const exe = ev.dataTransfer.items[0].getAsFile()?.path
        if (exe) {
          return callTools('runExe', exe)
        }
      }
    }
    return
  }

  function dragOverHandler(ev: React.DragEvent<HTMLSpanElement>) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault()
  }

  return (
    <>
      <div data-testid="toolsSettings" className="settingsTools">
        <div className="toolsWrapper">
          <a
            href="#"
            data-testid="wineCFG"
            className="tools"
            style={{
              color: winecfgRunning ? 'var(--secondary)' : 'var(--primary)'
            }}
            onClick={() => callTools('winecfg')}
          >
            Winecfg
          </a>
          <a
            href="#"
            data-testid="wineTricks"
            className="tools"
            style={{
              color: winetricksRunning ? 'var(--secondary)' : 'var(--primary)'
            }}
            onClick={() => callTools('winetricks')}
          >
            Winetricks
          </a>
          <a
            href="#"
            data-testid="toolsDrag"
            draggable
            onDrop={(ev) => dropHandler(ev)}
            onDragOver={(ev) => dragOverHandler(ev)}
            className="tools drag"
            onClick={() => handleRunExe()}
          >
            {t('setting.runexe.title')}
            <br />
            <span>{t('setting.runexe.message')}</span>
          </a>
        </div>
      </div>
    </>
  )
}
