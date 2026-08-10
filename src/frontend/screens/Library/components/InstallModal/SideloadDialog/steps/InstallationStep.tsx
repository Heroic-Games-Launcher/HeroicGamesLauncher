import { useTranslation } from 'react-i18next'
import { Box, Button, CircularProgress, Typography } from '@mui/material'
import InstallDesktopIcon from '@mui/icons-material/InstallDesktop'
import RedoIcon from '@mui/icons-material/Redo'

import HorizontalSelector from 'frontend/components/UI/HorizontalSelector'

type Props = {
  handleRunExe: () => void
  onSkip: () => void
  runningSetup: boolean
}

export default function InstallationStep({
  handleRunExe,
  onSkip,
  runningSetup
}: Props) {
  const { t } = useTranslation('gamepage')

  if (runningSetup)
    return (
      <Box
        height={'100%'}
        display={'flex'}
        justifyContent={'center'}
        alignItems={'center'}
        flexDirection={'column'}
        gap={2}
      >
        <CircularProgress
          sx={{
            color: 'var(--primary-active)'
          }}
        />
        <Typography variant={'h5'}>
          {t('button.running-setup', 'Running installer...')}
        </Typography>
        <Button
          variant={'outlined'}
          startIcon={<RedoIcon />}
          sx={{
            color: 'var(--primary-active)',
            borderColor: 'var(--primary-active)',
            ['&:hover']: {
              borderColor: 'var(--primary-hover)'
            }
          }}
          onClick={onSkip}
        >
          {t('button.skip-waiting', 'Skip waiting')}
        </Button>
      </Box>
    )

  return (
    <Box
      height={'100%'}
      display={'flex'}
      justifyContent={'center'}
      alignItems={'center'}
    >
      <HorizontalSelector
        options={[
          {
            icon: <InstallDesktopIcon fontSize={'large'} />,
            title: t('button.run-installer.title', 'Run installer'),
            subtitle: t(
              'button.run-installer.subtitle',
              'The game comes with an installer I need to run before I can play it'
            ),
            onClick: handleRunExe
          },

          {
            icon: <RedoIcon fontSize={'large'} />,
            title: t('button.skip-installer.title', 'Skip'),
            subtitle: t(
              'button.skip-installer.subtitle',
              'I already have a game executable I can run to play the game'
            ),
            onClick: onSkip
          }
        ]}
      />
    </Box>
  )
}
