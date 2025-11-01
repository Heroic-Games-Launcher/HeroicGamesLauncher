import { useTranslation } from 'react-i18next'
import { CustomLibraryUrls } from '../../components'

export default function CustomLibrariesSettings() {
  const { t } = useTranslation()

  return (
    <>
      <h3 className="settingSubheader">
        {t('settings.navbar.custom_libraries', 'Custom Libraries')}
      </h3>

      <CustomLibraryUrls />
    </>
  )
}
