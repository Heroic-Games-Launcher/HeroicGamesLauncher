import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import SettingsContext from '../SettingsContext'
import { useGlobalConfig } from 'frontend/hooks/config'

const DiscordRPC = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const [
    discordRPC,
    setDiscordRPC,
    rpcFetched,
    isSetToDefault,
    resetToDefaultValue
  ] = useGlobalConfig('discordRichPresence')

  if (!isDefault || !rpcFetched) return <></>

  return (
    <ToggleSwitch
      htmlId="discordRPC"
      value={discordRPC}
      handleChange={async () => setDiscordRPC(!discordRPC)}
      title={t('setting.discordRPC', 'Enable Discord Rich Presence')}
      isSetToDefaultValue={isSetToDefault}
      resetToDefaultValue={resetToDefaultValue}
    />
  )
}

export default DiscordRPC
