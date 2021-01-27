import React from 'react'
import { WineProps } from '../../types'
const { ipcRenderer } = window.require('electron')

interface Props {
  wineVersion: WineProps
  winePrefix: string
}

export default function Tools({ wineVersion, winePrefix }: Props) {
  const callTools = (tool: string) =>
    ipcRenderer.send('callTool', {
      tool,
      wine: wineVersion.bin,
      prefix: winePrefix,
    })
  return (
    <>
      <div className="settingsTools">
        <div className="buttonsWrapper">
          <button
            className="button settings"
            onClick={() => callTools('winecfg')}
          >
            Winecfg
          </button>
          <button
            className="button settings"
            onClick={() => callTools('winetricks')}
          >
            Winetricks
          </button>
        </div>
      </div>
    </>
  )
}
