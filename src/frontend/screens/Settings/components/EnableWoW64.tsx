import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../SettingsContext'

const EnableWoW64 = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isLinuxNative } = useContext(SettingsContext)
  const isLinux = platform === 'linux'
  const [enableWoW64, setEnableWoW64] = useSetting('enableWoW64', false)

  if (!isLinux || isLinuxNative) {
    return <></>
  }

  return (
    <>
      <ToggleSwitch
        info={t(
          'help.WoW64',
          'The new WoW64 mode runs 32-bit Windows games on a 64-bit Wine prefix without 32-bit host libraries. It is fully supported in Wine 11, but still opt-in in Proton.'
        )}
        description={t(
          'setting.wow64.description',
          'Run 32-bit games inside a 64-bit prefix, no separate prefix needed'
        )}
        htmlId="WoW64Toggle"
        value={enableWoW64 || false}
        handleChange={() => setEnableWoW64(!enableWoW64)}
        title={t('setting.WoW64', 'Force new WoW64 mode')}
      />
    </>
  )
}

export default EnableWoW64
