import { GameInfo } from 'common/types'
import { SvgButton } from 'frontend/components/UI'
import SettingsIcoAlt from 'frontend/assets/settings_icon_alt.svg?react'
import useGlobalState from 'frontend/state/GlobalStateV2'
import type { GameHandle } from 'frontend/helpers/ipc'

interface Props {
  game: GameHandle
  gameInfo: GameInfo
}

const SettingsButton = ({ game, gameInfo }: Props) => {
  const { openGameSettingsModal } = useGlobalState.keys('openGameSettingsModal')

  if (!gameInfo.is_installed) {
    return null
  }

  return (
    <SvgButton
      onClick={() => openGameSettingsModal(game)}
      className={`settings-icon`}
    >
      <SettingsIcoAlt />
    </SvgButton>
  )
}

export default SettingsButton
