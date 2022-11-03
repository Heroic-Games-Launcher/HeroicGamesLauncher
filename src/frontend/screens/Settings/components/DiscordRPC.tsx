import React, { useContext } from 'react'
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
      htmlId="discordRPC"
      value={discordRPC}
      handleChange={() => setDiscordRPC(!discordRPC)}
      title={t('setting.discordRPC', 'Enable Discord Rich Presence')}
    />
  )
}

export default DiscordRPC
