import { TextInputField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import React from 'react'
import { useTranslation } from 'react-i18next'

const SteamAppId = () => {
  const { t } = useTranslation()

  const [steamAppId, setSteamAppId] = useSetting('steamAppId', '')

  return (
    <TextInputField
      label={t('setting.steam_appid', 'Override Steam AppId')}
      htmlId="steam-appid"
      placeholder={t('placeholder.steam_appid', 'App Id (e.g.: 123456)')}
      value={steamAppId}
      onChange={(event) => setSteamAppId(event.target.value)}
    />
  )
}

export default SteamAppId
