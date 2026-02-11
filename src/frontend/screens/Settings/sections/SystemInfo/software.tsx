import React from 'react'

import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'

import HeroicIcon from 'frontend/assets/heroic-icon.svg?react'

import type { SystemInformation } from 'backend/utils/systeminfo'
import { useTranslation } from 'react-i18next'

interface Props {
  software: SystemInformation['softwareInUse']
}

function SoftwareInfo({ software }: Props) {
  const { t } = useTranslation()

  const {
    heroicVersion,
    legendaryVersion,
    gogdlVersion,
    cometVersion,
    nileVersion
  } = software

  return (
    <Paper sx={{ padding: 1 }} square>
      <Typography variant="h6">
        {t('settings.systemInformation.software', 'Software:')}
      </Typography>
      <Grid container>
        <Grid size={2}>
          <HeroicIcon className="heroic-icon" />
        </Grid>
        <Grid size={10}>
          {t(
            'settings.systemInformation.heroicVersion',
            'Heroic: {{heroicVersion}}',
            {
              heroicVersion
            }
          )}
          <br />
          {t(
            'settings.systemInformation.legendaryVersion',
            'Legendary: {{legendaryVersion}}',
            { legendaryVersion }
          )}
          <br />
          {t(
            'settings.systemInformation.gogdlVersion',
            'Gogdl: {{gogdlVersion}}',
            {
              gogdlVersion
            }
          )}
          <br />
          {t(
            'settings.systemInformation.cometVersion',
            'Comet: {{cometVersion}}',
            {
              cometVersion
            }
          )}
          <br />
          {t(
            'settings.systemInformation.nileVersion',
            'Nile: {{nileVersion}}',
            {
              nileVersion
            }
          )}
        </Grid>
      </Grid>
    </Paper>
  )
}

export default React.memo(SoftwareInfo)
