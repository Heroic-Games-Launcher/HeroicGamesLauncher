import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'

const EnableEsync = () => {
  const { t } = useTranslation()

  const [enableEsync, setEnableEsync] = useSetting('enableEsync', false)

  return (
    <ToggleSwitch
      info={t(
        'help.esync',
        'Esync is only relevant for Proton 10 and older patched Wine builds. It was removed from Proton 11 and is ignored by upstream Wine.'
      )}
      description={t(
        'setting.esync-description',
        'Legacy eventfd synchronisation, only used by older Proton/Wine builds'
      )}
      htmlId="esyncToggle"
      value={enableEsync || false}
      handleChange={() => setEnableEsync(!enableEsync)}
      title={t('setting.esync', 'Enable Esync (legacy)')}
    />
  )
}

export default EnableEsync
