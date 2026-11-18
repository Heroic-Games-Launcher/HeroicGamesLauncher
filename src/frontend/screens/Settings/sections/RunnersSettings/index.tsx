import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { Boxes, Gamepad2, Package, Store } from 'lucide-react'
import { SettingsCard } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import {
  AltAureliaBin,
  AltGOGdlBin,
  AltLegendaryBin,
  AltNileBin,
  DefaultSteamPath,
  DisableGOGAffiliate,
  DisableGOGPresence,
  EgsSettings,
  ShowValveProton
} from '../../components'

export default function RunnersSettings() {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'

  return (
    <div className="settingsSections">
      <SettingsCard
        glyph={Gamepad2}
        title={t('settings.section.epic', 'Epic Games')}
      >
        <AltLegendaryBin />
        <EgsSettings />
      </SettingsCard>

      <SettingsCard glyph={Store} title={t('settings.section.gog', 'GOG')}>
        <AltGOGdlBin />
        <DisableGOGPresence />
        <DisableGOGAffiliate />
      </SettingsCard>

      <SettingsCard
        glyph={Package}
        title={t('settings.section.amazon', 'Amazon Games')}
      >
        <AltNileBin />
      </SettingsCard>

      <SettingsCard glyph={Boxes} title={t('settings.section.steam', 'Steam')}>
        <AltAureliaBin />
        <DefaultSteamPath />
        {isLinux && <ShowValveProton />}
      </SettingsCard>
    </div>
  )
}
