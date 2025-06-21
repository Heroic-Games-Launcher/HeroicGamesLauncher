import React, { useCallback, useMemo, useState } from 'react'
import { Box, MenuItem } from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

import { useShallowGlobalState } from 'frontend/state/GlobalStateV2'
import { SelectField } from 'frontend/components/UI/index'

import LibrarySelectorItem from './LibrarySelectorItem'
import LibraryCreationDialog from './LibraryCreationDialog'

interface Props {
  selectedLibraryIndex: number
  setSelectedLibraryIndex: (index: number) => void
  showAddOption?: boolean
}

export default React.memo(function LibrarySelector({
  selectedLibraryIndex,
  setSelectedLibraryIndex,
  showAddOption
}: Props) {
  const { t } = useTranslation()
  const { libraries } = useShallowGlobalState('libraries')
  const [showLibraryCreationDialog, setShowLibraryCreationDialog] =
    useState(false)

  const createNewLibrary = useCallback(() => {
    setShowLibraryCreationDialog(true)
  }, [setShowLibraryCreationDialog])

  const addLibraryItem = useMemo(() => {
    if (!showAddOption) return <></>

    return (
      <MenuItem
        value={Object.entries(libraries).length}
        onClick={createNewLibrary}
      >
        <Box display="flex" flexDirection="row" alignItems="center">
          <AddIcon />
          <Box sx={{ ml: 1 }}>
            {t('settings.libraries.createNew', 'New library...')}
          </Box>
        </Box>
      </MenuItem>
    )
  }, [showAddOption, createNewLibrary, Object.entries(libraries).length])

  return (
    <>
      <SelectField
        htmlId="library-selector"
        value={String(selectedLibraryIndex)}
        onChange={(e) => {
          setSelectedLibraryIndex(Number(e.target.value))
        }}
      >
        {Object.entries(libraries).map(([path, info], i) => (
          <MenuItem key={i} value={i}>
            <LibrarySelectorItem path={path} info={info} />
          </MenuItem>
        ))}
        {addLibraryItem}
      </SelectField>
      {showAddOption && (
        <LibraryCreationDialog
          closed={!showLibraryCreationDialog}
          close={() => setShowLibraryCreationDialog(false)}
          onUserCancel={() => setSelectedLibraryIndex(0)}
        />
      )}
    </>
  )
})
