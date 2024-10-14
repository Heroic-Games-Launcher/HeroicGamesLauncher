import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { LibraryTopSectionOptions } from 'common/types'
import { MenuItem, SelectChangeEvent } from '@mui/material'

const LibraryTopSection = () => {
  const { t } = useTranslation()
  const { handleLibraryTopSection } = useContext(ContextProvider)
  const [libraryTopSection, setLibraryTopSection] = useSetting(
    'libraryTopSection',
    'disabled'
  )

  const onSectionChange = (event: SelectChangeEvent) => {
    const newValue = event.target.value as LibraryTopSectionOptions
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
      <MenuItem value="recently_played">
        {t(
          'setting.library_top_option.recently_played',
          'Recently Played Games'
        )}
      </MenuItem>
      <MenuItem value="recently_played_installed">
        {t(
          'setting.library_top_option.recently_played_installed',
          'Recently Played Games (Only Installed)'
        )}
      </MenuItem>
      <MenuItem value="favourites">
        {t('setting.library_top_option.favourites', 'Favourite Games')}
      </MenuItem>
      <MenuItem value="disabled">
        {t('setting.library_top_option.disabled', 'Disabled')}
      </MenuItem>
    </SelectField>
  )
}

export default LibraryTopSection
