import './index.css'

import React, { useState } from 'react'

import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { getGameInfo, quoteIfNecessary } from 'src/helpers'

import { ipcRenderer } from 'src/helpers'
import { Runner } from 'src/types'

interface Props {
  appName: string
  runner: Runner
}

export default function Tools({ appName, runner }: Props) {
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
    exe = exe ? quoteIfNecessary(exe) : undefined
    await ipcRenderer.invoke('callTool', {
      tool,
      exe,
      appName,
      runner
    })
    setWinetricksRunning(false)
    setWinecfgRunning(false)
  }

  const handleRunExe = async () => {
    let exe = ''
    const gameinfo = await getGameInfo(appName, runner)
    const { path } = await ipcRenderer.invoke('openDialog', {
      buttonLabel: t('box.select.button', 'Select'),
      properties: ['openFile'],
      title: t('box.runexe.title'),
      defaultPath: gameinfo.install.install_path
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
          <button
            data-testid="wineCFG"
            className={classNames('button outline', { active: winecfgRunning })}
            onClick={async () => callTools('winecfg')}
          >
            <span className="toolTitle">Winecfg</span>
          </button>
          <button
            data-testid="wineTricks"
            className={classNames('button outline', {
              active: winetricksRunning
            })}
            onClick={async () => callTools('winetricks')}
          >
            <span className="toolTitle">Winetricks</span>
          </button>
          <a
            data-testid="toolsDrag"
            draggable
            onDrop={(ev) => dropHandler(ev)}
            onDragOver={(ev) => dragOverHandler(ev)}
            className="tools drag"
            onClick={async () => handleRunExe()}
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
