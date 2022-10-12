import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from '/src/frontend/hooks/useSetting'
import { toggleControllerIsDisabled } from '/src/frontend/helpers/gamepad'
import { ToggleSwitch } from '/src/frontend/components/UI'

const DisableController = () => {
  const { t } = useTranslation()
  const [disableController, setDisableController] = useSetting<boolean>(
    'disableController',
    false
  )

  useEffect(() => {
    toggleControllerIsDisabled(disableController)
  }, [disableController])

  return (
    <ToggleSwitch
      htmlId="disableController"
      value={disableController}
      handleChange={() => setDisableController(!disableController)}
      title={t(
        'setting.disable_controller',
        'Disable Heroic navigation using controller'
      )}
    />
  )
}

export default DisableController
