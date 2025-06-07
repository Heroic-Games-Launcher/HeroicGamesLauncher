import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  LinearProgress,
  Typography,
  Paper,
  type LinearProgressProps,
  CircularProgress
} from '@mui/material'
import { Warning as WarningIcon } from '@mui/icons-material'

import { bytesToSize } from 'frontend/helpers'
import { useAwaited } from 'frontend/hooks/useAwaited'
import { CachedImage } from 'frontend/components/UI'

import type { LibraryInfo } from 'backend/libraries/types'
import { useNavigate } from 'react-router-dom'

interface LibraryGameListEntryProps {
  game: LibraryInfo['games'][number]
}

const LibraryGameListEntry = React.memo(function LibraryGameListEntry({
  game
}: LibraryGameListEntryProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const gameInfo = useAwaited(() =>
    window.api.getGameInfo(game.appName, game.runner)
  )

  if (!gameInfo) return <CircularProgress />

  const { art_square, title } = gameInfo

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={1}
      sx={{ cursor: 'pointer' }}
      onClick={() =>
        navigate(`/gamepage/${game.runner}/${game.appName}`, {
          state: { gameInfo }
        })
      }
    >
      <CachedImage src={art_square} style={{ height: '15vh' }} />
      <Box>
        <h4>{title}</h4>
        <Box>
          {t(
            'settings.libraries.gameListEntry.size',
            'Size: {{formattedSize}}',
            {
              formattedSize: gameInfo.install.install_size!
            }
          )}
        </Box>
        <Box>
          {t('settings.libraries.gameListEntry.version', 'Version: {{ver}}', {
            ver: game.version
          })}
        </Box>
      </Box>
    </Box>
  )
})

interface InfoProps {
  info: LibraryInfo
}

const LibraryGameList = React.memo(function LibraryGameList({
  info
}: InfoProps) {
  const { t } = useTranslation()

  if (!info.games.length)
    return (
      <h5>
        {t(
          'settings.libraries.libraryIsEmptyMessage',
          'This library contains no games'
        )}
      </h5>
    )

  return (
    <Paper
      sx={{
        background: 'var(--navbar-background)',
        color: 'currentColor',
        p: 1.5
      }}
    >
      <h5>
        {t(
          'settings.libraries.gamesInLibraryTitle',
          'Games in library ({{numOfGames}})',
          {
            numOfGames: info.games.length
          }
        )}
      </h5>
      <Box display="flex" flexDirection="column" gap={1}>
        {info.games.map((game, i) => (
          <LibraryGameListEntry key={i} game={game} />
        ))}
      </Box>
    </Paper>
  )
})

const LibraryDiskSpaceInfo = React.memo(function LibraryDiskSpaceInfo({
  info
}: InfoProps) {
  const { t } = useTranslation()
  const usedSpace = useMemo(() => info.totalSpace - info.freeSpace, [info])

  const diskUsageColor: LinearProgressProps['color'] = useMemo(() => {
    const percent = usedSpace / info.totalSpace
    if (percent < 0.8) return 'success'
    if (percent < 0.9) return 'warning'
    return 'error'
  }, [info, usedSpace])

  return (
    <Box>
      <Typography>
        {t('settings.libraries.diskUsage', 'Disk usage:')}
      </Typography>
      <Box
        display="flex"
        flexDirection="row"
        alignItems="center"
        flexWrap="nowrap"
        gap={1}
      >
        <LinearProgress
          sx={{ flexGrow: 1 }}
          variant="determinate"
          value={(usedSpace / info.totalSpace) * 100}
          color={diskUsageColor}
        />
        {t(
          'settings.libraries.diskUsageStat',
          '{{percentVal}}% ({{freeSpace}} free)',
          {
            percentVal: ((usedSpace / info.totalSpace) * 100).toFixed(),
            freeSpace: bytesToSize(info.freeSpace)
          }
        )}
      </Box>
    </Box>
  )
})

interface Props {
  info: LibraryInfo | false
}

export default React.memo(function LibraryInfo({ info }: Props) {
  const { t } = useTranslation()

  if (!info)
    return (
      <Box display="flex" flexDirection="row" alignItems="center" gap={1}>
        <WarningIcon />
        <Typography>
          {t(
            'settings.libraries.infoUnreadable',
            'Failed to read library information. Make sure the disk containing the library is connected.'
          )}
        </Typography>
      </Box>
    )

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <LibraryDiskSpaceInfo info={info} />
      <LibraryGameList info={info} />
    </Box>
  )
})
