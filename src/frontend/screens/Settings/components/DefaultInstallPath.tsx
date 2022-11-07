import React from 'react'
import { useTranslation } from 'react-i18next'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import useSetting from 'frontend/hooks/useSetting'
import { TextInputWithIconField } from 'frontend/components/UI'

const DefaultInstallPath = () => {
  const { t } = useTranslation()
  const [defaultInstallPath, setDefaultInstallPath] = useSetting(
    'defaultInstallPath',
    ''
  )

  const onFolderIconClick = async () => {
    window.api
      .openDialog({
        buttonLabel: t('box.choose'),
        properties: ['openDirectory'],
        title: t('box.default-install-path'),
        defaultPath: defaultInstallPath
      })
      .then((path) => setDefaultInstallPath(path || defaultInstallPath))
  }

  return (
    <TextInputWithIconField
      label={t('setting.default-install-path')}
      htmlId="default_install_path"
      value={defaultInstallPath?.replaceAll("'", '')}
      placeholder={defaultInstallPath}
      onChange={(event) => setDefaultInstallPath(event.target.value)}
      icon={
        <FontAwesomeIcon
          icon={faFolderOpen}
          data-testid="setinstallpathbutton"
        />
      }
      onIconClick={onFolderIconClick}
    />
  )
}

export default DefaultInstallPath
