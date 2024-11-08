import './index.scss'

import React, { useContext, useState } from 'react'

import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { getGameInfo } from 'frontend/helpers'

import SettingsContext from '../../SettingsContext'
import { Winetricks } from 'frontend/components/UI'

export default function Tools() {
  const { t } = useTranslation()
  const [winecfgRunning, setWinecfgRunning] = useState(false)
  const [winetricksRunning, setWinetricksRunning] = useState(false)
  const [runExeRunning, setRunExeRunning] = useState(false)
  const { appName, runner, isDefault } = useContext(SettingsContext)

  if (isDefault || isWindows) {
    return <></>
  }

  async function callTools(tool: 'winecfg' | 'runExe', exe?: string) {
    const toolStates = {
      winecfg: setWinecfgRunning,
      runExe: setRunExeRunning
    }

    if (tool in toolStates) {
      toolStates[tool](true)
    }

    await window.api.callTool({
      tool,
      exe,
      appName,
      runner
    })

    if (tool in toolStates) {
      toolStates[tool](false)
    }
  }

  const handleRunExe = async () => {
    let exe = ''
    const gameinfo = await getGameInfo(appName, runner)
    if (!gameinfo) return
    const defaultPath =
      gameinfo.runner === 'sideload' ? undefined : gameinfo.install.install_path

    const path = await window.api.openDialog({
      buttonLabel: t('box.select.button', 'Select'),
      properties: ['openFile'],
      title: t('box.runexe.title', 'Select EXE to Run'),
      defaultPath
    })
    if (path) {
      exe = path
      callTools('runExe', exe)
    }
  }

  async function dropHandler(ev: React.DragEvent<HTMLSpanElement>) {
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

  function openWinetricksDialog() {
    setWinetricksRunning(true)
  }

  function winetricksDialogClosed() {
    setWinetricksRunning(false)
  }

  return (
    <>
      <div data-testid="toolsSettings" className="settingsTools">
        {winetricksRunning && <Winetricks onClose={winetricksDialogClosed} />}
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
            className="button outline"
            onClick={async () => openWinetricksDialog()}
          >
            <span className="toolTitle">Winetricks</span>
          </button>
          <a
            onDrop={async (ev) => dropHandler(ev)}
            onDragOver={(ev) => dragOverHandler(ev)}
            className={classNames('button outline drag', {
              active: runExeRunning
            })}
            onClick={handleRunExe}
          >
            {t('setting.runexe.title')} <br />
            <span>{t('setting.runexe.message')}</span>
          </a>
        </div>
      </div>
    </>
  )
}
