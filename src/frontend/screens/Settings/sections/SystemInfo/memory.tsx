import React from 'react'
import Typography from '@mui/material/Typography'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'

import type { SystemInformation } from 'backend/utils/systeminfo'
import { useTranslation } from 'react-i18next'

interface Props {
  memory: SystemInformation['memory']
}

function MemoryProgress({ memory }: Props) {
  const { total, used, totalFormatted, usedFormatted } = memory
  const { t } = useTranslation()

  const memoryUsedInPercent = (used / total) * 100

  return (
    <Paper sx={{ p: 1, height: '100%' }} square>
      <Typography variant="h6">
        {t('settings.systemInformation.memory', 'Memory:')}
      </Typography>
      <LinearProgress variant="determinate" value={memoryUsedInPercent} />
      <Typography>
        {t(
          'settings.systemInformation.memoryStats',
          '{{percentUsed}}% used ({{usedGib}} / {{totalGib}}',
          {
            percentUsed: Math.round(memoryUsedInPercent),
            usedGib: usedFormatted,
            totalGib: totalFormatted
          }
        )}
      </Typography>
    </Paper>
  )
}

export default React.memo(MemoryProgress)
