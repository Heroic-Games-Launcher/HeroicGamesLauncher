import { useCallback, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../SettingsContext'
import InfoIcon from 'frontend/components/UI/InfoIcon'
import { Box, MenuItem, Stack, Typography } from '@mui/material'
import type { SteamRuntimeName } from 'common/types/umu'

// Names as they appear in the Steam client
const RUNTIME_NAMES = {
  'umu-scout': 'Steam Linux Runtime 1.0 (scout-on-soldier)',
  'umu-soldier': 'Steam Linux Runtime 2.0 (soldier)',
  'umu-sniper': 'Steam Linux Runtime 3.0 (sniper)',
  'umu-steamrt4': 'Steam Linux Runtime 4.0'
} as const satisfies Record<SteamRuntimeName, string>

function SteamRuntime() {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isDefault, isLinuxNative } = useContext(SettingsContext)
  const [gameSteamRuntime, setGameSteamRuntime] = useSetting(
    'steamRuntime',
    false
  )
  const [defaultSteamRuntime, setDefaultSteamRuntime] = useSetting(
    'defaultSteamRuntime',
    false
  )

  const steamRuntime = isDefault ? defaultSteamRuntime : gameSteamRuntime
  const setSteamRuntime = isDefault
    ? setDefaultSteamRuntime
    : setGameSteamRuntime

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

  if (platform !== 'linux' || (!isDefault && !isLinuxNative)) return <></>

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
      >
        <Typography>
          {isDefault
            ? t(
                'setting.steamRuntime.defaultLabel',
                'Default Steam runtime (native Linux games)'
              )
            : t(
                'setting.steamRuntime.label',
                'Steam runtime (native Linux games)'
              )}
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
              {t('setting.steamRuntime.noRuntimeOption', 'None (run on host)')}
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
              'Run native Linux games inside a Steam Linux Runtime container. The global default applies to games without an explicit per-game choice; Proton games are launched through umu automatically.'
            )}
          />
        </Box>
      </Stack>
    </>
  )
}

export default SteamRuntime
