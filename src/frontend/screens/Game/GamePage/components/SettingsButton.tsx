import React, { useContext } from 'react'
import { GameInfo } from 'common/types'
import ContextProvider from 'frontend/state/ContextProvider'
import { SvgButton } from 'frontend/components/UI'
import { ReactComponent as SettingsIcoAlt } from 'frontend/assets/settings_icon_alt.svg'

interface Props {
  gameInfo: GameInfo
}

const SettingsButton = ({ gameInfo }: Props) => {
  const { setIsSettingsModalOpen } = useContext(ContextProvider)

  if (!gameInfo.is_installed) {
    return null
  }

  return (
    <SvgButton
      onClick={() => setIsSettingsModalOpen(true, 'settings', gameInfo)}
      className={`settings-icon`}
    >
      <SettingsIcoAlt />
    </SvgButton>
  )
}

export default SettingsButton
