import React, { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { LibraryTopSectionOptions } from 'common/types'
import { useGlobalState } from 'frontend/state/GlobalStateV2'

const LibraryTopSection = () => {
  const { t } = useTranslation()
  const [libraryTopSection, setLibraryTopSection] = useSetting(
    'libraryTopSection',
    'disabled'
  )

  const onSectionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value as LibraryTopSectionOptions
    useGlobalState.setState({ libraryTopSection: newValue })
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
