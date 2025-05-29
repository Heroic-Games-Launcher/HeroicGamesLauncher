import React from 'react'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

import type { SystemInformation } from 'backend/utils/systeminfo'
import { useTranslation } from 'react-i18next'
import VendorLogo from './vendorLogo'

function CPUCard({ cpu }: { cpu: SystemInformation['CPU'] }) {
  const { model, cores } = cpu
  const { t } = useTranslation()

  return (
    <Paper sx={{ padding: 1, height: '100%' }} square>
      <Typography variant="h6">
        {t('settings.systemInformation.cpu', 'CPU:')}
      </Typography>
      <Grid container spacing={1}>
        <Grid size={2}>
          <VendorLogo model={model} />
        </Grid>
        <Grid size={10}>
          {t(
            'settings.systemInformation.cpuDescription',
            '{{numOfCores}}x {{modelName}}',
            { numOfCores: cores, modelName: model }
          )}
        </Grid>
      </Grid>
    </Paper>
  )
}

export default React.memo(CPUCard)
