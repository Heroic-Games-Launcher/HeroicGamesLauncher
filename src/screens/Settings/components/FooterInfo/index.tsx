import { IpcRenderer } from 'electron'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
interface ElectronProps {
  ipcRenderer: IpcRenderer
}

const { ipcRenderer } = window.require('electron') as ElectronProps

interface Props {
  appName: string
}

export default function FooterInfo({ appName }: Props) {
  const [heroicVersion, setHeroicVersion] = useState('')
  const { t } = useTranslation()
  const isDefault = appName === 'default'

  useEffect(() => {
    ipcRenderer
      .invoke('getHeroicVersion')
      .then((version) => setHeroicVersion(version))
  }, [])

  return (
    <div>
      <span className="save">{t('info.settings')}</span>
      <span className="save">
        {t('info.heroic.version', 'Heroic Version')}: {heroicVersion}
      </span>
      {!isDefault && <span className="appName">AppName: {appName}</span>}
    </div>
  )
}
