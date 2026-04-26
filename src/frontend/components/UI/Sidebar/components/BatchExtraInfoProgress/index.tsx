import React from 'react'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload } from '@fortawesome/free-solid-svg-icons'
import Box from '@mui/material/Box'
import { useExtraInfoBatchProgress } from 'frontend/state/ExtraInfoBatchProgress'
import './index.css'
import { useTranslation } from 'react-i18next'

export default React.memo(function BatchExtraInfoProgress() {
  const { t } = useTranslation()
  const { isActive, totalGames, completedGames, currentGameTitle } = useExtraInfoBatchProgress(
    ({ isActive, totalGames, completedGames, currentGameTitle }) => ({
      isActive,
      totalGames,
      completedGames,
      currentGameTitle
    })
  )

  if (!isActive) {
    return null
  }

  const percent = totalGames > 0 ? (completedGames / totalGames) * 100 : 0

  return (
    <div className="batchExtraInfoProgress">
      <span className="statusIcon" title={t('library.downloadingExtraInfo', 'Downloading Extra Info')}>
        <FontAwesomeIcon icon={faDownload} />
      </span>

      <div className="full-size">
        <span className="gameTitle">
          {t('library.downloadingExtraInfoFor', 'Downloading Extra Info for {{game}}', { game: currentGameTitle || '...' })}
        </span>
        <br />
        <span className="downloadStatus">
          {t('library.downloadingExtraInfoProgress', '{{completed}} / {{total}} games', { completed: completedGames, total: totalGames })}
        </span>
        <br />
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: '100%', mr: 1 }}>
            <LinearProgress variant="determinate" value={percent} />
          </Box>
          <Box sx={{ minWidth: 35 }}>
            <Typography variant="body2">{`${Math.ceil(percent)}%`}</Typography>
          </Box>
        </Box>
      </div>
    </div>
  )
})