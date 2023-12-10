import React from 'react'

import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faApple, faLinux, faWindows } from '@fortawesome/free-brands-svg-icons'

import type { SystemInformation } from 'backend/utils/systeminfo'
import { useTranslation } from 'react-i18next'

interface OSLogoProps {
  platform: string
}

function OSLogo({ platform }: OSLogoProps) {
  if (platform === 'win32')
    return <FontAwesomeIcon icon={faWindows} className="logo" />
  if (platform === 'darwin')
    return <FontAwesomeIcon icon={faApple} className="logo" />
  if (platform === 'linux')
    return <FontAwesomeIcon icon={faLinux} className="logo" />
  return <></>
}

interface OSInfoProps {
  os: SystemInformation['OS']
  isFlatpak: boolean
}

function OSInfo({ os, isFlatpak }: OSInfoProps) {
  const { t } = useTranslation()
  return (
    <Paper sx={{ padding: 1, height: '100%' }} square>
      <Typography variant="h6">
        {t('settings.systemInformation.os', 'Operating System:')}
      </Typography>
      <Grid container spacing={1}>
        <Grid item xs={2}>
          <OSLogo platform={os.platform} />
        </Grid>
        <Grid item xs={10}>
          {isFlatpak
            ? t(
                'settings.systemInformation.osNameFlatpak',
                '{{osName}} (inside Flatpak)',
                { osName: os.name }
              )
            : os.name}
          <br />
          {t(
            'settings.systemInformation.osVersion',
            'Version {{versionNumber}}',
            {
              versionNumber: os.version
            }
          )}
        </Grid>
      </Grid>
    </Paper>
  )
}

export default React.memo(OSInfo)
