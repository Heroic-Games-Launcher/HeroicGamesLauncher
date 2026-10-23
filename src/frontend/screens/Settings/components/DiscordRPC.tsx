import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'

const DiscordRPC = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const [discordRPC, setDiscordRPC] = useSetting('discordRPC', false)

  if (!isDefault) {
    return <></>
  }

  return (
    <ToggleSwitch
      description={t(
        'setting.discordRPC.description',
        'Show the game you are playing on your Discord profile'
      )}
      htmlId="discordRPC"
      value={discordRPC}
      handleChange={() => setDiscordRPC(!discordRPC)}
      title={t('setting.discordRPC', 'Enable Discord Rich Presence')}
    />
  )
}

export default DiscordRPC
