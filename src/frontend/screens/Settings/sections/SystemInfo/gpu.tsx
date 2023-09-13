import React from 'react'
import { useTranslation } from 'react-i18next'

import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'

import VendorLogo from './vendorLogo'

import type { SystemInformation } from 'backend/utils/systeminfo'

interface GPUCardProps {
  gpu: SystemInformation['GPUs'][number]
  gpuNumber: number
  showNumber: boolean
}

function GPUCard({ gpu, gpuNumber, showNumber }: GPUCardProps) {
  const {
    vendorString,
    deviceString,
    deviceId,
    vendorId,
    subdeviceId,
    subvendorId,
    driverVersion
  } = gpu
  const { t } = useTranslation()

  const headingText = showNumber
    ? t('settings.systemInformation.gpuWithNumber', 'GPU {{number}}:', {
        number: gpuNumber + 1
      })
    : t('settings.systemInformation.gpu', 'GPU:')

  return (
    <Paper sx={{ padding: 1, height: '100%' }} square>
      <Typography variant="h6">{headingText}</Typography>
      <Grid container spacing={1}>
        <Grid item xs={2}>
          <VendorLogo model={vendorString} />
        </Grid>
        <Grid item xs={10}>
          {deviceString}
          <br />
          DID={deviceId} VID={vendorId}, DSID={subdeviceId} VSID={subvendorId}
          <br />
          {t(
            'settings.systemInformation.gpuDriver',
            'Driver: {{driverVersion}}',
            { driverVersion }
          )}
        </Grid>
      </Grid>
    </Paper>
  )
}

export default React.memo(GPUCard)
