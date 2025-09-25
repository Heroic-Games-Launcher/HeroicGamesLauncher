import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../SettingsContext'
import InfoIcon from 'frontend/components/UI/InfoIcon'

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
      <div className="toggleRow">
        <ToggleSwitch
          htmlId="WoW64Toggle"
          value={enableWoW64 || false}
          handleChange={() => setEnableWoW64(!enableWoW64)}
          title={t('setting.WoW64', 'Enable WoW64 (Experimental)')}
        />

        <InfoIcon
          text={t(
            'help.WoW64',
            'The Wine WoW64 mode allows 32-bit Windows games to be run on 64-bit Wine. Enabling may improve performance, but could also break older 32-bit games.'
          )}
        />
      </div>
    </>
  )
}

export default EnableWoW64
