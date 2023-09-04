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
      <Grid container>
        <Grid item xs={2}>
          <VendorLogo model={model} />
        </Grid>
        <Grid item xs={10}>
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
