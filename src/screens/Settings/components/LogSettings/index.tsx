import './index.css'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

const { ipcRenderer } = window.require('electron')

interface Props {
  isDefault: boolean
  appName: string
}

export default function LogSettings({ isDefault, appName }: Props) {
  const { t } = useTranslation()
  const [logFileContent, setLogFileContent] = useState<string[]>([])
  const [logFileExist, setLogFileExist] = useState<boolean>(false)

  ipcRenderer
    .invoke('getCurrentLogContent', { isDefault, appName })
    .then((content: string[]) => {
      setLogFileContent(content)
      setLogFileExist(true)
    })
    .catch(() => {
      setLogFileContent([t('setting.no-log-file', 'No log file found.')])
      setLogFileExist(false)
    })

  function showLogFileInFolder() {
    ipcRenderer.send('showLogFileInFolder', { isDefault, appName })
  }

  return (
    <>
      <span className="setting log-box">
        <br />
        {logFileContent.map((line, key) => {
          if (line.toLowerCase().includes('err')) {
            return (
              <p key={key} className="log-error">
                {line}
              </p>
            )
          } else if (line.toLowerCase().includes('warn')) {
            return (
              <p key={key} className="log-warning">
                {line}
              </p>
            )
          } else {
            return (
              <p key={key} className="log-info">
                {line}
              </p>
            )
          }
        })}
        <br />
      </span>
      {logFileExist && (
        <button
          className={`setting button is-primary`}
          onClick={showLogFileInFolder}
        >
          {t('setting.show-log-folder', 'Show log file in folder')}
        </button>
      )}
    </>
  )
}
