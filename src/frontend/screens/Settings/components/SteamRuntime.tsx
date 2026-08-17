import { useCallback, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'
import InfoIcon from 'frontend/components/UI/InfoIcon'
import { Box, MenuItem, Stack, Typography } from '@mui/material'
import type { SteamRuntimeName } from 'common/types/umu'

// Names as they appear in the Steam client
const RUNTIME_NAMES = {
  'umu-scout': 'Steam Linux Runtime 1.0 (scout)',
  'umu-soldier': 'Steam Linux Runtime 2.0 (soldier)',
  'umu-sniper': 'Steam Linux Runtime 3.0 (sniper)',
  'umu-steamrt4': 'Steam Linux Runtime 4.0'
} as const satisfies Record<SteamRuntimeName, string>

function SteamRuntime() {
  const { t } = useTranslation()
  const { isLinuxNative } = useContext(SettingsContext)
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [steamRuntime, setSteamRuntime] = useSetting('steamRuntime', false)

  const parseAndSet = useCallback(
    (value: string) => {
      switch (value) {
        case 'umu-scout':
        case 'umu-soldier':
        case 'umu-sniper':
        case 'umu-steamrt4':
          setSteamRuntime(value)
          break
        case 'none':
          setSteamRuntime(false)
      }
    },
    [setSteamRuntime]
  )

  if (!(isLinux && isLinuxNative)) return <></>

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
      >
        <Typography>
          {t('setting.steamRuntime.label', 'Use Steam Runtime')}
        </Typography>
        <Box
          display="flex"
          flexDirection="row"
          alignItems="center"
          gap={2}
          width="60%"
          sx={{
            [`& .selectFieldWrapper`]: {
              paddingTop: 0,
              paddingBottom: 0
            }
          }}
        >
          <SelectField
            htmlId="steamruntime"
            onChange={(event) => parseAndSet(event.target.value)}
            value={steamRuntime || 'none'}
          >
            <MenuItem value={'none'}>
              {t('setting.steamRuntime.noRuntimeOption', 'None')}
            </MenuItem>
            {Object.entries(RUNTIME_NAMES).map(([id, name]) => (
              <MenuItem key={id} value={id}>
                {name}
              </MenuItem>
            ))}
          </SelectField>
          <InfoIcon
            text={t(
              'help.steamruntime',
              'Custom libraries provided by Steam to help run Linux and Windows (Proton) games. Enabling might improve compatibility.'
            )}
          />
        </Box>
      </Stack>
    </>
  )
}

export default SteamRuntime
