import React, { useMemo } from 'react'
import { Box, Typography } from '@mui/material'
import {
  Storage as StorageIcon,
  SdCard as SdCardIcon,
  Warning as WarningIcon
} from '@mui/icons-material'

import type { LibraryInfo } from 'backend/libraries/types'

interface Props {
  path: string
  info: LibraryInfo | false
}

export default React.memo(function LibrarySelectorItem({ path, info }: Props) {
  const icon = useMemo(() => {
    if (!info) return <WarningIcon />
    if (info.type === 'removable') return <SdCardIcon />
    return <StorageIcon />
  }, [info])

  return (
    <Box display="flex" flexDirection="row" alignItems="center">
      {icon}
      <Box sx={{ ml: 1 }}>
        <Typography>{info ? info.name : path}</Typography>
        {info && (
          <Typography sx={{ fontSize: 'var(--text-xs)' }}>{path}</Typography>
        )}
      </Box>
    </Box>
  )
})
