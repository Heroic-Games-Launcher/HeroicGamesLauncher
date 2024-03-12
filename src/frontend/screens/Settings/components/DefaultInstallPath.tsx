import React from 'react'
import { useTranslation } from 'react-i18next'
import { PathSelectionBox } from 'frontend/components/UI'
import { hasHelp } from 'frontend/hooks/hasHelp'
import { useGlobalConfig } from 'frontend/hooks/config'

const DefaultInstallPath = () => {
  const { t } = useTranslation()

  hasHelp(
    'defaultInstallPath',
    t('setting.default-install-path'),
    <p>
      {t(
        'help.content.defaultInstallPath',
        'This is the default path preselected when installing games.'
      )}
    </p>
  )
  const [defaultInstallPath, setDefaultInstallPath, defaultInstallPathFetched] =
    useGlobalConfig('defaultInstallPath')
  if (!defaultInstallPathFetched) return <></>

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
