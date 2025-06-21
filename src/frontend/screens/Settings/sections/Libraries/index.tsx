import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box } from '@mui/material'
import { StyledEngineProvider } from '@mui/material/styles'

import { useShallowGlobalState } from 'frontend/state/GlobalStateV2'
import LibrarySelector from 'frontend/components/UI/LibrarySelector'

import LibraryActions from './LibraryActions'
import LibraryInfo from './LibraryInfo'

export default React.memo(function Libraries() {
  const { t } = useTranslation()
  const { libraries } = useShallowGlobalState('libraries')
  const [selectedLibraryIndex, setSelectedLibraryIndex] = useState(0)

  const selectedLibrary = useMemo(
    () => Object.entries(libraries).at(selectedLibraryIndex),
    [libraries, selectedLibraryIndex]
  )

  return (
    <StyledEngineProvider injectFirst>
      <h3>{t('settings.navbar.libraries', 'Libraries')}</h3>
      <LibrarySelector
        selectedLibraryIndex={selectedLibraryIndex}
        setSelectedLibraryIndex={setSelectedLibraryIndex}
        showAddOption
      />
      {selectedLibrary && (
        <Box
          width="100%"
          display="flex"
          flexDirection="column"
          textAlign="start"
          borderTop={1}
          paddingTop={2}
          gap={2}
        >
          <LibraryActions
            path={selectedLibrary[0]}
            info={selectedLibrary[1]}
            resetLibrarySelector={() => setSelectedLibraryIndex(0)}
          />
          <LibraryInfo info={selectedLibrary[1]} />
        </Box>
      )}
    </StyledEngineProvider>
  )
})
