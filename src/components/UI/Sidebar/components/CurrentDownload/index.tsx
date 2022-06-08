import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { getGameInfo } from 'src/helpers'
import { hasProgress } from 'src/hooks/hasProgress'
import { Runner } from 'src/types'
import './index.css'
import { useTranslation } from 'react-i18next'

type Props = {
  appName: string
  runner: Runner | undefined
}

export default function CurrentDownload({ appName, runner }: Props) {
  const [progress] = hasProgress(appName)
  const [gameTitle, setGameTitle] = useState('')
  const { t } = useTranslation()
  useEffect(() => {
    const getGameTitle = async () => {
      const { title } = await getGameInfo(appName, runner)
      setGameTitle(title)
    }
    getGameTitle()
  }, [appName])

  return (
    <>
      <Link to={`gamepage/${appName}`} className="currentDownload">
        <span className="gameTitle">{gameTitle ?? 'GameName'}</span>
        <br />
        <span className="downloadStatus">
          {progress.percent > 98
            ? t('status.processing', 'Processing files, please wait')
            : t('status.installing', 'Installing')}
        </span>
        <br />
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: '100%', mr: 1 }}>
            <LinearProgress variant="determinate" value={progress.percent} />
          </Box>
          <Box sx={{ minWidth: 35 }}>
            <Typography variant="body2">{`${Math.round(
              progress.percent || 0
            )}%`}</Typography>
          </Box>
        </Box>
      </Link>
    </>
  )
}
