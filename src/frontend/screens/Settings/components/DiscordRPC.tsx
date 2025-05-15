import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { InfoBox, TextInputField, ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'

const DiscordRPC = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const [discordRPC, setDiscordRPC] = useSetting('discordRPC', false)
  const [RPCAppId, setRPCAppId] = useSetting(
    'discordRPCAppId',
    '852942976564723722'
  )
  const [RPCDetails, setRPCDetails] = useSetting('discordRPCDetails', '{game}')
  const [RPCState, setRPCState] = useSetting(
    'discordRPCState',
    'via Heroic on {platform}'
  )

  if (!isDefault) {
    return <></>
  }

  return (
    <>
      <ToggleSwitch
        htmlId="discordRPC"
        value={discordRPC}
        handleChange={() => setDiscordRPC(!discordRPC)}
        title={t('setting.discordRPC', 'Enable Discord Rich Presence')}
      />
      {discordRPC && (
        <div
          style={{
            marginLeft: 'var(--space-md)'
          }}
        >
          <InfoBox text="infobox.help">
            {t(
              'help.discordRPC',
              'Provide a Discord Application ID to show your status as "Playing <app_name>" on Discord. Both Details (line 1) and State (line 2) are optional and accept {game} and {platform} variables for game name and device platform respectively.'
            )}
          </InfoBox>
          <TextInputField
            htmlId="discordRPCAppID"
            label={t('setting.discordRPCAppID', 'Application ID')}
            value={RPCAppId}
            onChange={(event) => setRPCAppId(event.target.value)}
          />
          <TextInputField
            htmlId="discordRPCDetails"
            label={t('setting.discordRPCDetails', 'Details')}
            value={RPCDetails}
            onChange={(event) => setRPCDetails(event.target.value)}
          />
          <TextInputField
            htmlId="discordRPCState"
            label={t('setting.discordRPCState', 'State')}
            value={
              typeof RPCState === 'string'
                ? RPCState
                : 'via Heroic on {platform}'
            }
            onChange={(event) => setRPCState(event.target.value)}
          />
        </div>
      )}
    </>
  )
}

export default DiscordRPC
