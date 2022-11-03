import './index.scss'

import React, { useContext, useEffect, useState } from 'react'

import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { getGameInfo } from 'frontend/helpers'

import { ProgressDialog } from 'frontend/components/UI/ProgressDialog'
import SettingsContext from '../../SettingsContext'

export default function Tools() {
  const { t } = useTranslation()
  const [winecfgRunning, setWinecfgRunning] = useState(false)
  const [winetricksRunning, setWinetricksRunning] = useState(false)
  const [progress, setProgress] = useState<string[]>([])
  const { appName, runner, isDefault } = useContext(SettingsContext)

  if (isDefault) {
    return <></>
  }

  type Tool = 'winecfg' | 'winetricks' | string
  async function callTools(tool: Tool, exe?: string) {
    if (tool === 'winetricks') {
      setWinetricksRunning(true)
    }
    if (tool === 'winecfg') {
      setWinecfgRunning(true)
    }
    await window.api.callTool({
      tool,
      exe,
      appName,
      runner
    })
    setWinetricksRunning(false)
    setWinecfgRunning(false)
  }

  useEffect(() => {
    const onProgress = (e: Electron.IpcRendererEvent, messages: string[]) => {
      setProgress(messages)
    }

    const removeWinetricksProgressListener =
      window.api.handleProgressOfWinetricks(onProgress)

    //useEffect unmount
    return removeWinetricksProgressListener
  }, [])

  useEffect(() => {
    setProgress([])
  }, [winetricksRunning])

  const handleRunExe = async () => {
    let exe = ''
    const gameinfo = await getGameInfo(appName, runner)
    const { path } = await window.api.openDialog({
      buttonLabel: t('box.select.button', 'Select'),
      properties: ['openFile'],
      title: t('box.runexe.title', 'Select EXE to Run'),
      defaultPath: gameinfo.install.install_path
    })
    if (path) {
      exe = path
      callTools('runExe', exe)
    }
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
        {winetricksRunning && (
          <ProgressDialog
            title={'Winetricks'}
            progress={progress}
            showCloseButton={false}
            onClose={() => {
              return
            }}
          />
        )}
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
            onDrop={(ev) => dropHandler(ev)}
            onDragOver={(ev) => dragOverHandler(ev)}
            className="button outline drag"
            onClick={handleRunExe}
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
