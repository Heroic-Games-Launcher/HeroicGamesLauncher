import React from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { PathSelectionBox } from 'frontend/components/UI'

const DefaultInstallPath = () => {
  const { t } = useTranslation()
  const [defaultInstallPath, setDefaultInstallPath] = useSetting(
    'defaultInstallPath',
    ''
  )

  return (
    <PathSelectionBox
      type="directory"
      onPathChange={setDefaultInstallPath}
      path={defaultInstallPath}
      pathDialogTitle={t('box.default-install-path')}
      pathDialogDefaultPath={defaultInstallPath}
      label={t('setting.default-install-path')}
      htmlId="default_install_path"
      noDeleteButton
    />
  )
}

export default DefaultInstallPath
