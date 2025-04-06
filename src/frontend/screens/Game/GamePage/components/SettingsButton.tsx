import React from 'react'
import { GameInfo } from 'common/types'
import { SvgButton } from 'frontend/components/UI'
import SettingsIcoAlt from 'frontend/assets/settings_icon_alt.svg?react'
import { useShallowGlobalState } from 'frontend/state/GlobalStateV2'

interface Props {
  gameInfo: GameInfo
}

const SettingsButton = ({ gameInfo }: Props) => {
  const { openGameSettingsModal } = useShallowGlobalState(
    'openGameSettingsModal'
  )

  if (!gameInfo.is_installed) {
    return null
  }

  return (
    <SvgButton
      onClick={() => openGameSettingsModal(gameInfo)}
      className={`settings-icon`}
    >
      <SettingsIcoAlt />
    </SvgButton>
  )
}

export default SettingsButton
