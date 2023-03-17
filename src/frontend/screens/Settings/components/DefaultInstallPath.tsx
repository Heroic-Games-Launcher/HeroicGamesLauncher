import React from 'react'
import { useTranslation } from 'react-i18next'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import useSetting from 'frontend/hooks/useSetting'
import { TextInputWithIconField } from 'frontend/components/UI'
import { configStore } from 'frontend/helpers/electronStores'

const DefaultInstallPath = () => {
  const { t } = useTranslation()
  const [defaultInstallPath, setDefaultInstallPath] = useSetting(
    'defaultInstallPath',
    ''
  )

  function setInstallPath(path: string) {
    setDefaultInstallPath(path)
    configStore.set('settings.defaultInstallPath', path)
  }

  const onFolderIconClick = async () => {
    window.api
      .openDialog({
        buttonLabel: t('box.choose'),
        properties: ['openDirectory'],
        title: t('box.default-install-path'),
        defaultPath: defaultInstallPath
      })
      .then((path) => setInstallPath(path || defaultInstallPath))
  }

  return (
    <TextInputWithIconField
      label={t('setting.default-install-path')}
      htmlId="default_install_path"
      value={defaultInstallPath?.replaceAll("'", '')}
      placeholder={defaultInstallPath}
      onChange={(event) => setInstallPath(event.target.value)}
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
