import { useEffect, useCallback, useContext, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography
} from '@mui/material'
import WarningIcon from '@mui/icons-material/Warning'

import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import CachedImage from 'frontend/components/UI/CachedImage'
import ContextProvider from 'frontend/state/ContextProvider'
import useGlobalState from 'frontend/state/GlobalStateV2'

import type { GameInfo, Runner } from 'common/types'

import './index.css'

export default function ExeFilePicker() {
  const [running, setRunning] = useState(false)
  const [search, setSearch] = useState('')
  const { epic, gog, amazon, zoom, sideloadedLibrary } =
    useContext(ContextProvider)
  const { t } = useTranslation()
  const {
    exeRunDialog: { open, exePath, flatpakInaccessible }
  } = useGlobalState.keys('exeRunDialog')

  const allGames = useMemo(
    () => [
      ...sideloadedLibrary,
      ...epic.library,
      ...gog.library,
      ...amazon.library,
      ...zoom.library
    ],
    [sideloadedLibrary, epic.library, gog.library, amazon.library, zoom.library]
  )

  const [nonNativeGames, setNonNativeGames] = useState<GameInfo[] | null>(null)

  useEffect(() => {
    async function filterAll() {
      const newNonNativeGames: GameInfo[] = []

      async function addIfNonNative(game: GameInfo) {
        if (!game.is_installed) return
        if (game.title === 'Galaxy Common Redistributables') return

        const native = await window.api.isNative({
          appName: game.app_name,
          runner: game.runner
        })
        if (native) return
        newNonNativeGames.push(game)
      }

      await Promise.all(allGames.map(addIfNonNative))
      setNonNativeGames(newNonNativeGames)
    }
    void filterAll()
  }, [allGames])

  const filtered =
    search && nonNativeGames
      ? nonNativeGames.filter((g) =>
          g.title.toLowerCase().includes(search.toLowerCase())
        )
      : nonNativeGames

  const handleClose = useCallback(() => {
    setRunning(false)
    setSearch('')
    useGlobalState.setState({ exeRunDialog: { open: false } })
  }, [])

  const handlePick = useCallback(
    async (appName: string, runner: Runner) => {
      if (!exePath) return
      setRunning(true)
      return window.api.exe_handler
        .launchWithExeFile(exePath, appName, runner)
        .then(handleClose)
    },
    [exePath, handleClose]
  )

  const warning = useMemo(() => {
    if (flatpakInaccessible)
      return t(
        'exeFilePicker.flatpakWarning',
        'The selected executable is not accessible to Heroic. If ' +
          'you run this executable, it will not see any other files in its ' +
          'containing folder. To fix this, move the executable into an ' +
          'accessible location (e.g. ~/Games/Heroic).'
      )
    return null
  }, [flatpakInaccessible, t])

  return (
    <>
      {open && (
        <Dialog onClose={handleClose} showCloseButton>
          <DialogHeader onClose={handleClose}>
            {t('exeFilePicker.title', 'Open EXE')}
          </DialogHeader>
          <DialogContent>
            <Box
              width={'50vw'}
              minHeight={'50vh'}
              display={'flex'}
              justifyContent={'center'}
              flexDirection={'column'}
              gap={1}
            >
              {filtered && !running ? (
                <>
                  <Typography
                    variant={'subtitle2'}
                    sx={{ color: 'var(--text-secondary)' }}
                  >
                    {t(
                      'exeFilePicker.description',
                      'You have opened an executable file with ' +
                        'Heroic. Please select the game you wish to run this ' +
                        'EXE file on.'
                    )}
                  </Typography>
                  {warning && (
                    <Box
                      display={'flex'}
                      alignItems={'center'}
                      justifyContent={'center'}
                      gap={1}
                    >
                      <WarningIcon
                        sx={{ fill: 'var(--status-warning-hover)' }}
                      />
                      <Typography
                        variant={'subtitle2'}
                        sx={{ color: 'var(--status-warning-hover)' }}
                      >
                        {warning}
                      </Typography>
                    </Box>
                  )}

                  <TextField
                    variant={'filled'}
                    sx={{
                      [`& .MuiFilledInput-root`]: {
                        color: 'var(--text-default)',
                        backgroundColor: 'var(--background-lighter) !important',
                        ['&:hover:not(.Mui-disabled, .Mui-error):before']: {
                          borderColor: 'var(--brand-primary-hover)'
                        },
                        [`& .MuiFilledInput-input`]: {
                          padding: 1
                        },
                        [`&::before`]: {
                          borderColor: 'var(--text-default)'
                        },
                        ['&::after']: {
                          borderColor: 'var(--brand-primary)'
                        }
                      }
                    }}
                    placeholder={t('exeFilePicker.search', 'Search games...')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    fullWidth
                  />
                  <Box
                    flexGrow={1}
                    overflow={'auto'}
                    display={'flex'}
                    flexDirection={'column'}
                    alignItems={'start'}
                  >
                    {filtered.map((g) => (
                      <Button
                        key={g.app_name}
                        onClick={() => handlePick(g.app_name, g.runner)}
                        sx={{
                          display: 'flex',
                          color: 'var(--text-default)',
                          gap: 1,
                          justifyContent: 'start',
                          width: '100%'
                        }}
                      >
                        <CachedImage
                          src={g.art_square}
                          className="exeFilePicker__gameIcon"
                        />
                        <Typography>{g.title}</Typography>
                      </Button>
                    ))}
                  </Box>
                </>
              ) : (
                <Box
                  flexGrow={1}
                  display={'flex'}
                  alignItems={'center'}
                  justifyContent={'center'}
                >
                  <Box
                    display={'flex'}
                    flexDirection={'column'}
                    alignItems={'center'}
                    gap={1}
                  >
                    <CircularProgress
                      sx={{
                        color: 'var(--text-default)'
                      }}
                    />
                    <Typography>
                      {running
                        ? t('exeFilePicker.running', 'Running executable...')
                        : t('exeFilePicker.loading', 'Loading game list...')}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
