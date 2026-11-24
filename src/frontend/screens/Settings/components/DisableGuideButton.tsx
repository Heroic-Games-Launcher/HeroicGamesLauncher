import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { updateGamepadActions } from 'frontend/helpers/gamepad'
import { ToggleSwitch } from 'frontend/components/UI'

const DisableGuideButton = () => {
  const { t } = useTranslation()
  const [disableGuideButton, setDisableGuideButton] = useSetting(
    'disableGuideButton',
    false
  )

  return (
    <ToggleSwitch
      description={t(
        'setting.disableGuideButton.description',
        'Stop the Guide/PS button from opening console mode. You can still enter it from the library.'
      )}
      htmlId="disableGuideButton"
      value={disableGuideButton}
      handleChange={() => {
        setDisableGuideButton(!disableGuideButton)
        updateGamepadActions()
      }}
      title={t('setting.disable_guide_button', 'Disable console mode shortcut')}
    />
  )
}

export default DisableGuideButton
