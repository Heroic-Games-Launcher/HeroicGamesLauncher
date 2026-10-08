import { Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GameInfo } from 'common/types'
import { Button, Icon, Tooltip } from 'frontend/components/UI'
import useGlobalState from 'frontend/state/GlobalStateV2'

interface Props {
  gameInfo: GameInfo
}

const SettingsButton = ({ gameInfo }: Props) => {
  const { t } = useTranslation()
  const { openGameSettingsModal } = useGlobalState.keys('openGameSettingsModal')

  if (!gameInfo.is_installed) {
    return null
  }

  const label = t('game.settings', 'Game settings')

  return (
    <Tooltip content={label}>
      <Button
        variant="ghost"
        className="settings-icon settingsIcon"
        aria-label={label}
        onClick={() => openGameSettingsModal(gameInfo)}
        icon={<Icon glyph={Settings} size="lg" />}
      />
    </Tooltip>
  )
}

export default SettingsButton
