import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { TextInputField, ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { defaultWineVersion } from '../util'

const UmuOptions = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)
  const [umuGameId, setUmuGameId] = useSetting('umuGameId', '')
  const [disableProtonFixes, setDisableProtonFixes] = useSetting(
    'disableProtonFixes',
    false
  )

  if (platform !== 'linux' || wineVersion.type !== 'proton') {
    return <></>
  }

  return (
    <>
      <TextInputField
        htmlId="umuGameId"
        label={t('setting.umuGameId', 'UMU GAMEID override')}
        placeholder={t(
          'placeholder.umuGameId',
          'Leave blank to use the value from the UMU database'
        )}
        value={umuGameId}
        onChange={(newValue) => setUmuGameId(newValue)}
        info={t(
          'help.umuGameId',
          'UMU uses GAMEID to apply Proton fixes and store metadata. Set this only when the game is missing from the UMU database or the wrong fixes are applied.'
        )}
      />
      <ToggleSwitch
        htmlId="disableProtonFixes"
        value={disableProtonFixes}
        handleChange={() => setDisableProtonFixes(!disableProtonFixes)}
        title={t('setting.disableProtonFixes', 'Disable UMU game fixes')}
        description={t(
          'setting.disableProtonFixes-description',
          'Skip umu-protonfixes for this game'
        )}
        info={t(
          'help.disableProtonFixes',
          'Use this when a Proton fix breaks the game. It only affects fixes applied by umu, not Proton itself.'
        )}
      />
    </>
  )
}

export default UmuOptions
