import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UpdateComponent } from 'src/components/UI'
import './index.css'

import { ipcRenderer } from 'src/helpers'

interface LogBoxProps {
  logFileContent: string
}

const LogBox: React.FC<LogBoxProps> = ({ logFileContent }) => {
  const { t } = useTranslation()
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
            'Log truncated, last 1000 lines are shown!'
          )}
        </span>
      )}
      <span className="setting log-box">
        {lines.map((line, key) => {
          if (line.toLowerCase().includes(' err')) {
            return (
              <p key={key} className="log-error">
                {line}
              </p>
            )
          } else if (line.toLowerCase().includes(' warn')) {
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

export interface LogSettingsProps {
  isDefault: boolean
  appName: string
}

export default function LogSettings({ isDefault, appName }: LogSettingsProps) {
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
  }, [isDefault, defaultLast])

  function showLogFileInFolder() {
    ipcRenderer.send('showLogFileInFolder', { isDefault, appName })
  }

  return (
    <>
      <h2>{t('setting.log.instructions_title', 'How to report a problem?')}</h2>
      <p className="report-problem-instructions">
        {t(
          'setting.log.instructions',
          'Join our Discord and look for the channel that matches your operating system. Share the content of the logs displayed here, and include a clear description of the problem with any relevant information and details.'
        )}
      </p>
      {isDefault && (
        <span className="log-buttongroup">
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
      {refreshing ? (
        <span className="log-box">
          <UpdateComponent inline />
        </span>
      ) : (
        <LogBox logFileContent={logFileContent} />
      )}
      {logFileExist && (
        <span className="footerFlex">
          <a
            onClick={showLogFileInFolder}
            title={t('setting.log.show-in-folder', 'Show log file in folder')}
            className="button is-footer"
          >
            <div className="button-icontext-flex">
              <div className="button-icon-flex">
                <FontAwesomeIcon icon={faFolderOpen} />
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
}
