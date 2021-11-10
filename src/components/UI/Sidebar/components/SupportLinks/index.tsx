import React from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPatreon, faDiscord } from '@fortawesome/free-brands-svg-icons'
import { faCoffee } from '@fortawesome/free-solid-svg-icons'
const { ipcRenderer } = window.require('electron')

import './index.css'
import { openDiscordLink } from 'src/helpers'
import { useTranslation } from 'react-i18next'

export default function SupportLinks() {
  const { t } = useTranslation()

  return (
    <div className="supportLinks">
      <button onClick={() => ipcRenderer.send('openPatreonPage')}><FontAwesomeIcon icon={faPatreon} /> Patreon</button>
      <button onClick={() => ipcRenderer.send('openKofiPage')}><FontAwesomeIcon icon={faCoffee} /> Ko-fi</button>
      <button onClick={() => () => openDiscordLink()}><FontAwesomeIcon icon={faDiscord} /> {t('userselector.discord', 'Discord')}</button>
    </div>
  )
}
