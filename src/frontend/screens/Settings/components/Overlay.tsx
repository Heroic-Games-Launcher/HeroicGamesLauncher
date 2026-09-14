import { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../SettingsContext'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import { SelectField } from 'frontend/components/UI'
import { MenuItem } from '@mui/material'

type SelectOptions = 'disable' | 'enable' | 'default'

const Overlay = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const { platform } = useContext(ContextProvider)

  const [forceDisableOverlay, setForceDisableOverlay] = useSetting(
    'forceDisableOverlay',
    false
  )
  const [forceEnableOverlay, setForceEnableOverlay] = useSetting(
    'forceEnableOverlay',
    false
  )

  const selectValue = useMemo(
    () =>
      forceDisableOverlay
        ? 'disable'
        : forceEnableOverlay
          ? 'enable'
          : 'default',
    [forceEnableOverlay, forceDisableOverlay]
  )

  const handleSettingChange = (value: SelectOptions) => {
    switch (value) {
      case 'default':
        setForceDisableOverlay(false)
        setForceEnableOverlay(false)
        break
      case 'disable':
        setForceDisableOverlay(true)
        setForceEnableOverlay(false)
        break
      case 'enable':
        setForceDisableOverlay(false)
        setForceEnableOverlay(true)
    }
  }

  // When we add support for GOG overlay on other platforms we can remove platform check
  if (isDefault || platform !== 'linux') {
    return <></>
  }

  /*
    t('setting.forceGalaxyOverlay.default', 'Default')
    t('setting.forceGalaxyOverlay.disable', 'Disable')
    t('setting.forceGalaxyOverlay.enable', 'Force enable')
   */
  return (
    <SelectField
      htmlId="overlaySetting"
      value={selectValue}
      onChange={(ev) => handleSettingChange(ev.target.value as SelectOptions)}
      label={t('setting.forceGalaxyOverlay.label', 'Galaxy Overlay')}
    >
      {['default', 'disable', 'enable'].map((val) => (
        <MenuItem key={val} value={val}>
          {t(`setting.forceGalaxyOverlay.${val}`)}
        </MenuItem>
      ))}
    </SelectField>
  )
}

export default Overlay
