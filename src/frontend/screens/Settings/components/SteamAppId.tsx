import { InfoBox, TextInputField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import React from 'react'
import { useTranslation } from 'react-i18next'

const SteamAppId = () => {
  const { t } = useTranslation()

  const [steamAppId, setSteamAppId] = useSetting('steamAppId', '')

  const infobox = (
    <InfoBox text="infobox.help">
      {t(
        'help.steam_appid.description',
        'Use an alternate Steam AppId for art when adding to the Steam library.'
      )}
      <br />
      {t(
        'help.steam_appid.fallback',
        'Leave blank to use the first AppId found in external sources (if any).'
      )}
    </InfoBox>
  )

  return (
    <TextInputField
      label={t('setting.steam_appid', 'Override Steam AppId')}
      htmlId="steam-appid"
      placeholder={t('placeholder.steam_appid', 'AppId (e.g.: 123456)')}
      value={steamAppId}
      onChange={(event) => setSteamAppId(event.target.value)}
      afterInput={infobox}
    />
  )
}

export default SteamAppId
