import './index.css'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

const { ipcRenderer } = window.require('electron')

interface Props {
  isDefault: boolean
  appName: string
}

export default function LogSettings({ isDefault, appName }: Props) {
  const { t } = useTranslation()
  const [logFileContent, setLogFileContent] = useState<string>('')
  const [logFileExist, setLogFileExist] = useState<boolean>(false)
  const [defaultLast, setDefaultLast] = useState<boolean>(false)

  const getLogContent = (defaultLast: boolean) => {
    ipcRenderer
      .invoke('getLogContent', { isDefault, appName, defaultLast })
      .then((content: string) => {
        setLogFileContent(content)
        setLogFileExist(true)
      })
      .catch(() => {
        setLogFileContent(t('setting.log.no-file', 'No log file found.'))
        setLogFileExist(false)
      })
  }

  useEffect(() => {
    const interval = setInterval(() => {
      getLogContent(defaultLast)
    }, 500)
    return () => clearInterval(interval)
  }, [defaultLast])

  function showLogFileInFolder() {
    ipcRenderer.send('showLogFileInFolder', { isDefault, appName })
  }

  return (
    <>
      {isDefault && (
        <span className="setting log-buttongroup toggleWrapper">
          <a
            className={`log-buttons ${!defaultLast ? 'log-choosen' : ''}`}
            onClick={() => setDefaultLast(false)}
            title={t('setting.log.current-log')}
          >
            {t('setting.log.current-log', 'Current log')}
          </a>
          <a
            className={`log-buttons ${defaultLast ? 'log-choosen' : ''}`}
            onClick={() => setDefaultLast(true)}
            title={t('setting.log.last-log')}
          >
            {t('setting.log.last-log', 'Last Log')}
          </a>
        </span>
      )}
      <span className="setting log-box">
        <br />
        {logFileContent?.split('\n').map((line, key) => {
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
        <span className="setting log-buttongroup">
          <a
            onClick={showLogFileInFolder}
            title={t('setting.log.show-in-folder', 'Show log file in folder.')}
            className="log-buttons"
          >
            <FolderOpenIcon />
          </a>
          <a
            onClick={() => {
              navigator.clipboard.writeText(logFileContent)
            }}
            title={t(
              'setting.log.copy-to-clipboard',
              'Copy log content to clipboard.'
            )}
            className="log-buttons"
          >
            <ContentCopyIcon />
          </a>
        </span>
      )}
    </>
  )
}
