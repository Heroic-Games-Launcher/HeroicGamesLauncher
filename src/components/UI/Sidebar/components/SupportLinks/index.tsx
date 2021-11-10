import React from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPatreon } from '@fortawesome/free-brands-svg-icons'
import { faCoffee } from '@fortawesome/free-solid-svg-icons'
const { ipcRenderer } = window.require('electron')

import './index.css'

export default function SupportLinks() {
  return (
    <div className="supportLinks">
      <button onClick={() => ipcRenderer.send('openPatreonPage')}><FontAwesomeIcon icon={faPatreon} /> Patreon</button>
      <button onClick={() => ipcRenderer.send('openKofiPage')}><FontAwesomeIcon icon={faCoffee} /> Ko-fi</button>
    </div>
  )
}
