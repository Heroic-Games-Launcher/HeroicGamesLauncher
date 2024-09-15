import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox, TextInputField, ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'

const DiscordRPC = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const [discordRPC, setDiscordRPC] = useSetting('discordRPC', {
    enabled: false
  })

  const handleOptionChange = (
    option: keyof typeof discordRPC,
    value: string | boolean
  ) => {
    setDiscordRPC({
      ...discordRPC,
      [option]: value
    })
  }

  if (!isDefault) {
    return <></>
  }

  return (
    <>
      <ToggleSwitch
        htmlId="discordRPC"
        value={discordRPC.enabled}
        handleChange={() => handleOptionChange('enabled', !discordRPC.enabled)}
        title={t('setting.discordRPC', 'Enable Discord Rich Presence')}
      />
      {discordRPC.enabled && (
        <div
          style={{
            marginLeft: 'var(--space-md)'
          }}
        >
          <InfoBox text="infobox.help">
            {t(
              'help.discordRPC',
              'Provide a Discord Application ID to show your status as "Playing <app_name>" on Discord. Title and State are optional and accept {game} and {platform} variables for game name and device platform respectively.'
            )}
          </InfoBox>
          <TextInputField
            htmlId="discordRPCAppID"
            label={t('setting.discordRPCAppID', 'Application ID')}
            value={discordRPC.appId}
            onChange={(event) =>
              handleOptionChange('appId', event.target.value)
            }
          />
          <TextInputField
            htmlId="discordRPCTitle"
            label={t('setting.discordRPCTitle', 'Title')}
            value={discordRPC.title}
            onChange={(event) =>
              handleOptionChange('title', event.target.value)
            }
          />
          <TextInputField
            htmlId="discordRPCState"
            label={t('setting.discordRPCState', 'State')}
            value={
              typeof discordRPC.state === 'string'
                ? discordRPC.state
                : 'via Heroic on {platform}'
            }
            onChange={(event) =>
              handleOptionChange('state', event.target.value)
            }
          />
        </div>
      )}
    </>
  )
}

export default DiscordRPC
