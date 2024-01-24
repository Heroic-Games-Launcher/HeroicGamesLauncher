import React from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'
import { useGlobalConfig } from 'frontend/hooks/config'
import type { LibraryTopSectionOptions } from 'backend/config/schemas'

const LibraryTopSection = () => {
  const { t } = useTranslation()
  const [libraryTopSection, setLibraryTopSection, topSectionConfigFetched] =
    useGlobalConfig('libraryTopSection')

  if (!topSectionConfigFetched) return <></>

  return (
    <SelectField
      label={t('setting.library_top_section', 'Library Top Section')}
      htmlId="library_top_section_selector"
      onChange={async (event) =>
        setLibraryTopSection(event.target.value as LibraryTopSectionOptions)
      }
      value={libraryTopSection}
    >
      <option value="recently_played">
        {t(
          'setting.library_top_option.recently_played',
          'Recently Played Games'
        )}
      </option>
      <option value="recently_played_installed">
        {t(
          'setting.library_top_option.recently_played_installed',
          'Recently Played Games (Only Installed)'
        )}
      </option>
      <option value="favourites">
        {t('setting.library_top_option.favourites', 'Favourite Games')}
      </option>
      <option value="disabled">
        {t('setting.library_top_option.disabled', 'Disabled')}
      </option>
    </SelectField>
  )
}

export default LibraryTopSection
