import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { defaultWineVersion } from '../util'

const PreferSystemLibs = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'
  const [preferSystemLibs, setPreferSystemLibs] = useSetting(
    'preferSystemLibs',
    false
  )

  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)

  const isSystemWine = wineVersion.bin.startsWith('/usr')
  const isProton = wineVersion.type === 'proton'
  const isCrossOver = wineVersion.type === 'crossover'
  const shouldNotRender = isProton || isWin || isCrossOver || isSystemWine

  if (shouldNotRender) {
    return <></>
  }

  return (
    <ToggleSwitch
      info={t(
        'help.preferSystemLibs',
        'Custom Wine versions (Wine-GE, Wine-Lutris) are shipped with their library dependencies. By enabling this option, these shipped libraries will be ignored and Wine will load system libraries instead. Warning! Issues may occur if dependencies are not met.'
      )}
      description={t(
        'setting.preferSystemLibs.description',
        'Use the libraries installed on your system instead of the bundled ones'
      )}
      htmlId="systemLibsToggle"
      value={preferSystemLibs || false}
      handleChange={() => setPreferSystemLibs(!preferSystemLibs)}
      title={t('setting.preferSystemLibs', 'Prefer system libraries')}
    />
  )
}

export default PreferSystemLibs
