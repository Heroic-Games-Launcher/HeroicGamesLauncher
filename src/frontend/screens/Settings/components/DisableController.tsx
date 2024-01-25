import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toggleControllerIsDisabled } from 'frontend/helpers/gamepad'
import { ToggleSwitch } from 'frontend/components/UI'
import { useGlobalConfig } from 'frontend/hooks/config'

const DisableController = () => {
  const { t } = useTranslation()
  const [
    disableController,
    setDisableController,
    controllerConfigFetched,
    isSetToDefault,
    resetToDefaultValue
  ] = useGlobalConfig('disableController')

  useEffect(() => {
    toggleControllerIsDisabled(disableController)
  }, [disableController])

  if (!controllerConfigFetched) return <></>

  return (
    <ToggleSwitch
      htmlId="disableController"
      value={disableController}
      handleChange={async () => setDisableController(!disableController)}
      title={t(
        'setting.disable_controller',
        'Disable Heroic navigation using controller'
      )}
      isSetToDefaultValue={isSetToDefault}
      resetToDefaultValue={resetToDefaultValue}
    />
  )
}

export default DisableController
