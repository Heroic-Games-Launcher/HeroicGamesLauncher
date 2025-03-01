import React, { useContext, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import { PathSelectionBox, SvgButton } from 'frontend/components/UI'
import SettingsContext from 'frontend/screens/Settings/SettingsContext'
import { Undo } from '@mui/icons-material'
import { Box } from '@mui/material'

const WinePrefixesBasePath = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isDefault } = useContext(SettingsContext)
  const isWindows = platform === 'win32'

  if (!isDefault || isWindows) {
    return <></>
  }

  const [defaultWinePrefix, setDefaultWinePrefix] = useSetting(
    'defaultWinePrefix',
    ''
  )
  const [lastValidPrefix, setLastValidPrefix] = useState(defaultWinePrefix)

  function handlePathChange(val: string) {
    setDefaultWinePrefix(val)
    if (val) {
      setLastValidPrefix(val)
    }
  }

  function handleRevert() {
    setDefaultWinePrefix(lastValidPrefix)
  }

  const warning = useMemo(() => {
    if (defaultWinePrefix !== '') return undefined
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          paddingBlockStart: 'var(--space-sm)',
          gap: 1,
          color: 'var(--status-warning)'
        }}
      >
        {t(
          'setting.defaultWinePrefixEmpty',
          'Warning: empty path may cause installation problems.'
        )}
        {lastValidPrefix && (
          <SvgButton
            className="button button-icon-flex is-danger"
            onClick={handleRevert}
          >
            <Undo />
          </SvgButton>
        )}
      </Box>
    )
  }, [])

  return (
    <PathSelectionBox
      htmlId="selectDefaultWinePrefix"
      label={t('setting.defaultWinePrefix', 'Set Folder for new Wine Prefixes')}
      path={defaultWinePrefix}
      onPathChange={handlePathChange}
      type="directory"
      pathDialogTitle={t(
        'toolbox.settings.wineprefix',
        'Select a Folder for new Wine Prefixes'
      )}
      noDeleteButton
      pathDialogDefaultPath={defaultWinePrefix}
      warning={warning}
    />
  )
}

export default WinePrefixesBasePath
