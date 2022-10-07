import React, { ChangeEvent, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { LibraryTopSectionOptions } from 'frontend/types'

const LibraryTopSection = () => {
  const { t } = useTranslation()
  const { handleLibraryTopSection } = useContext(ContextProvider)
  const [libraryTopSection, setLibraryTopSection] =
    useSetting<LibraryTopSectionOptions>('libraryTopSection', 'disabled')

  const onSectionChange = (event: ChangeEvent) => {
    const newValue = (event.target as HTMLSelectElement)
      .value as LibraryTopSectionOptions
    handleLibraryTopSection(newValue)
    setLibraryTopSection(newValue)
  }

  return (
    <SelectField
      label={t('setting.library_top_section', 'Library Top Section')}
      htmlId="library_top_section_selector"
      onChange={onSectionChange}
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
