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
        'Esync aims to reduce wineserver overhead in CPU-intensive games. Enabling may improve performance.'
      )}
      description={t(
        'setting.esync.description',
        'Speed up multi-threaded games using eventfd synchronisation'
      )}
      htmlId="esyncToggle"
      value={enableEsync || false}
      handleChange={() => setEnableEsync(!enableEsync)}
      title={t('setting.esync', 'Enable Esync')}
    />
  )
}

export default EnableEsync
