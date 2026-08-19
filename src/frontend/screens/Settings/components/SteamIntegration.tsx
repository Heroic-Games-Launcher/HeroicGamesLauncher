import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../SettingsContext'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const SteamIntegration = () => {
  const { t } = useTranslation()
  const { game, gameInfo } = useContext(SettingsContext)
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'

  const [steamIntegration, setSteamIntegration] = useState(false)

  // Family-Shared games need Steam to authorise the borrowed licence, so the
  // toggle is forced on and can't be disabled.
  const isFamilyShare = !!gameInfo?.isFamilyShare

  useEffect(() => {
    if (game?.runner === 'steam' && isLinux) {
      window.api.getSteamIntegrationEnabled(game).then(setSteamIntegration)
    }
  }, [game, isLinux])

  // Only relevant for Steam games launched through Aurelia/Proton on Linux.
  if (game?.runner !== 'steam' || !isLinux) {
    return <></>
  }

  const handleChange = () => {
    if (isFamilyShare) {
      return
    }
    const next = !steamIntegration
    setSteamIntegration(next)
    window.api.setSteamIntegrationEnabled(game, next)
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="steamIntegration"
        value={isFamilyShare || steamIntegration}
        disabled={isFamilyShare}
        handleChange={handleChange}
        title={t('setting.steamIntegration', 'Use Steam integration')}
      />

      <InfoIcon
        text={
          isFamilyShare
            ? t(
                'help.steamIntegrationFamilyShare',
                'This game is shared via Steam Family Sharing, which always requires a running Steam client to authorise the licence.'
              )
            : t(
                'help.steamIntegration',
                'Run the game with real Steam integration (bridging to the Steam client, started silently if needed) so Steamworks online features stay enabled. Off runs the game standalone without Steam.'
              )
        }
      />
    </div>
  )
}

export default SteamIntegration
