import './index.css'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'

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
  const [refreshing, setRefreshing] = useState<boolean>(true)

  const getLogContent = () => {
    ipcRenderer
      .invoke('getLogContent', { isDefault, appName, defaultLast })
      .then((content: string) => {
        setLogFileContent(content)
        setLogFileExist(true)
        setRefreshing(false)
      })
      .catch(() => {
        setLogFileContent(t('setting.log.no-file', 'No log file found.'))
        setLogFileExist(false)
        setRefreshing(false)
      })
  }

  useEffect(() => {
    if (defaultLast || !isDefault) {
      getLogContent()
      return
    } else {
      getLogContent()
      const interval = setInterval(() => {
        getLogContent()
      }, 1000)
      return () => clearInterval(interval)
    }
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
            onClick={() => {
              setRefreshing(true)
              setDefaultLast(false)
            }}
            title={t('setting.log.current-log')}
          >
            {t('setting.log.current-log', 'Current log')}
          </a>
          <a
            className={`log-buttons ${defaultLast ? 'log-choosen' : ''}`}
            onClick={() => {
              setRefreshing(true)
              setDefaultLast(true)
            }}
            title={t('setting.log.last-log')}
          >
            {t('setting.log.last-log', 'Last Log')}
          </a>
        </span>
      )}
      {refreshing ? 
        <span className="setting">
          <FontAwesomeIcon className="icon" icon={faSyncAlt} />
        </span>
      : formatLogBox()}
      {logFileExist && (
        <span className="footerFlex">
          <a
            onClick={showLogFileInFolder}
            title={t('setting.log.show-in-folder', 'Show log file in folder')}
            className="button is-footer"
          >
            <div className="button-icontext-flex">
              <div className="button-icon-flex">
                <FolderOpenIcon />
              </div>
              <span className="button-icon-text">
                {t('setting.log.show-in-folder', 'Show log file in folder')}
              </span>
            </div>
          </a>
          <a
            onClick={() => {
              navigator.clipboard.writeText(logFileContent)
            }}
            title={t(
              'setting.log.copy-to-clipboard',
              'Copy log content to clipboard.'
            )}
            className="button is-footer"
          >
            <div className="button-icontext-flex">
              <div className="button-icon-flex">
                <ContentCopyIcon />
              </div>
              <span className="button-icon-text">
                {t(
                  'setting.log.copy-to-clipboard',
                  'Copy log content to clipboard.'
                )}
              </span>
            </div>
          </a>
        </span>
      )}
    </>
  )

  function formatLogBox() {
    const maxLines = 1000
    let sliced = false
    let lines = logFileContent.split('\n')
    if (lines.length > maxLines) {
      lines = ['...', ...lines.slice(-maxLines)]
      sliced = true
    }

    return (
      <>
        {sliced && (
          <span className="setting long-log-hint">
            {t(
              'settings.log.long-log-hint',
              'To long log! Showing only last 1000 lines.'
            )}
          </span>
        )}
        <span className="setting log-box">
          {lines.map((line, key) => {
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
        </span>
      </>
    )
  }
}
