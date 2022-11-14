import React, { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload } from '@fortawesome/free-solid-svg-icons'
import Box from '@mui/material/Box'
import { getGameInfo } from 'frontend/helpers'
import { hasProgress } from 'frontend/hooks/hasProgress'
import { Runner } from 'common/types'
import './index.css'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import Badge from '@mui/material/Badge'

type Props = {
  appName: string
  runner: Runner
}

export default React.memo(function CurrentDownload({ appName, runner }: Props) {
  const [progress] = hasProgress(appName)
  const [gameTitle, setGameTitle] = useState('')
  const { sidebarCollapsed, libraryStatus } = useContext(ContextProvider)
  const { t } = useTranslation()

  useEffect(() => {
    const getGameTitle = async () => {
      // Hack for EOS Overlay. Not sure if this can be done better
      let title
      if (
        appName === '98bc04bc842e4906993fd6d6644ffb8d' &&
        runner === 'legendary'
      ) {
        title = 'EOS Overlay'
      } else {
        title = (await getGameInfo(appName, runner))!.title
      }
      setGameTitle(title)
    }
    getGameTitle()
  }, [appName])

  function getStatus() {
    return progress.percent > 98
      ? t('status.processing', 'Processing files, please wait')
      : t('status.installing', 'Installing')
  }

  if (!libraryStatus.length) {
    return null
  }

  return (
    <>
      <Link to={`/download-manager`} className="currentDownload">
        {sidebarCollapsed && (
          <span className="statusIcon" title={`${getStatus()} - ${gameTitle}`}>
            <Badge
              badgeContent={`${Math.round(progress.percent ?? 0)}%`}
              color="primary"
            >
              <FontAwesomeIcon icon={faDownload} />
            </Badge>
          </span>
        )}
        {!sidebarCollapsed && (
          <>
            <span className="gameTitle">{gameTitle ?? 'GameName'}</span>
            <br />
            <span className="downloadStatus">{getStatus()}</span>
            <br />
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={progress.percent || 0}
                />
              </Box>
              <Box sx={{ minWidth: 35 }}>
                <Typography variant="body2">{`${Math.round(
                  progress.percent || 0
                )}%`}</Typography>
              </Box>
            </Box>
          </>
        )}
      </Link>
    </>
  )
})
