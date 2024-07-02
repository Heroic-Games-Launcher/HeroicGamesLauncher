import React from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import { useGlobalState } from 'frontend/state/GlobalStateV2'
import { DialogModalOptions } from 'frontend/types'

const AllowInstallationBrokenAnticheat = () => {
  const { t } = useTranslation()
  const [allowInstallation, setAllowInstallation] = useSetting(
    'allowInstallationBrokenAnticheat',
    false
  )

  const toggleConfig = () => {
    if (allowInstallation) {
      setAllowInstallation(false)
    } else {
      const confirmDialog: DialogModalOptions = {
        showDialog: true,
        title: t(
          'setting.allow_installation_broken_anticheat.confirmation.title',
          'Are you sure?'
        ),
        message: t(
          'setting.allow_installation_broken_anticheat.confirmation.message',
          "Games with broken or denied anticheat may run, but multiplayer features won't work. Do not ask for support if you install them knowing this."
        ),
        buttons: [
          {
            text: t(
              'setting.allow_installation_broken_anticheat.confirmation.understand',
              'I understand'
            ),
            onClick: () => setAllowInstallation(true)
          },
          { text: t('box.no') }
        ],
        type: 'MESSAGE'
      }
      useGlobalState.setState({ dialogModalOptions: confirmDialog })
    }
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="disableAnticheatCheck"
        value={allowInstallation}
        handleChange={() => toggleConfig()}
        title={t(
          'setting.allow_installation_broken_anticheat.label',
          'Allow installation of games with broken or denied anticheat'
        )}
      />
    </div>
  )
}

export default AllowInstallationBrokenAnticheat
