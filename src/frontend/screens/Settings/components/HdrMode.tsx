import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { MenuItem } from '@mui/material'
import { SelectField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../SettingsContext'
import type { HDRMode } from 'common/types'

const HdrMode = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isLinuxNative } = useContext(SettingsContext)
  const [hdrMode, setHdrMode] = useSetting('hdrMode', 'auto')

  if (platform !== 'linux' || isLinuxNative) {
    return <></>
  }

  return (
    <SelectField
      htmlId="hdrMode"
      label={t('setting.hdrMode.label', 'HDR')}
      value={hdrMode}
      onChange={(event) => setHdrMode(event.target.value as HDRMode)}
      info={t(
        'help.hdrMode',
        'Auto lets the game and compositor negotiate HDR. Force is useful on compositors that do not report HDR headroom (for example KDE Plasma or Hyprland). Off disables HDR for games with washed-out or broken output.'
      )}
    >
      <MenuItem value="auto">
        {t('setting.hdrMode.auto', 'Auto (recommended)')}
      </MenuItem>
      <MenuItem value="force">{t('setting.hdrMode.force', 'Force')}</MenuItem>
      <MenuItem value="off">{t('setting.hdrMode.off', 'Off')}</MenuItem>
    </SelectField>
  )
}

export default HdrMode
