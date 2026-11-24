import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { MenuItem } from '@mui/material'
import { SelectField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { defaultWineVersion } from '../util'
import type { NVAPIMode } from 'common/types'

const ProtonNvapi = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)
  const [nvapiMode, setNvapiMode] = useSetting('nvapiMode', 'auto')

  if (platform !== 'linux' || wineVersion.type !== 'proton') {
    return <></>
  }

  return (
    <SelectField
      htmlId="nvapiMode"
      label={t('setting.nvapiMode.label', 'NVAPI / DLSS')}
      value={nvapiMode}
      onChange={(event) => setNvapiMode(event.target.value as NVAPIMode)}
      info={t(
        'help.nvapiMode',
        'Proton enables NVAPI by default. Turn it off if a game crashes or freezes on a non-NVIDIA GPU, or force it for games that do not enable DLSS automatically.'
      )}
    >
      <MenuItem value="auto">
        {t('setting.nvapiMode.auto', 'Auto (recommended)')}
      </MenuItem>
      <MenuItem value="off">{t('setting.nvapiMode.off', 'Off')}</MenuItem>
      <MenuItem value="force">{t('setting.nvapiMode.force', 'Force')}</MenuItem>
    </SelectField>
  )
}

export default ProtonNvapi
