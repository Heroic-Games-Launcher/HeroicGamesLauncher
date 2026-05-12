import './index.scss'

import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import ContextProvider from 'frontend/state/ContextProvider'
import { sendKill, updateGame } from 'frontend/helpers'
import HeroicIcon from 'frontend/assets/heroic-icon.svg?react'

import ConfirmDialog from './components/ConfirmDialog'
import ConsoleCard from './components/ConsoleCard'
import ControllerHints from './components/ControllerHints'
import LaunchOverlay from './components/LaunchOverlay'
import InstallOverlay from './InstallOverlay'
import {
  BTN_L1,
  BTN_R1,
  BTN_R2,
  getActionButtonLabel,
  getBackButtonLabel
} from './controller'
import { useColumnCount, useGamepadButtonPress, useGamepadInfo } from './hooks'

import type { TFunction } from 'i18next'
import type { GameInfo, Runner } from 'common/types'

type StoreKey = Runner | 'all'

const CANCEL_DOWNLOAD_COPY = {
  update: {
    title: (t: TFunction) => t('console.cancelUpdate.title', 'Cancel update?'),
    message: (t: TFunction) =>
      t(
        'console.cancelUpdate.message',
        'This game is currently downloading. Cancel the ongoing update?'
      )
  },
  install: {
    title: (t: TFunction) =>
      t('console.cancelInstall.title', 'Cancel installation?'),
    message: (t: TFunction) =>
      t(
        'console.cancelInstall.message',
        'This game is currently installing. Cancel the installation?'
      )
  }
} as const

export default function ConsoleMode() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    epic,
    gog,
    amazon,
    zoom,
    libraryStatus,
    sideloadedLibrary,
    refreshLibrary,
    refreshing,
    gameUpdates
  } = useContext(ContextProvider)

  const [activeStore, setActiveStore] = useState<StoreKey>('all')
  const [ascending, setAscending] = useState(true)
  const [filteringByInstalled, setFilteringByInstalled] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [launchingGame, setLaunchingGame] = useState<GameInfo | null>(null)
  const [installingGame, setInstallingGame] = useState<GameInfo | null>(null)
  const [updateNoticeGame, setUpdateNoticeGame] = useState<GameInfo | null>(
    null
  )
  const [cancelDownloadGame, setCancelDownloadGame] = useState<{
    game: GameInfo
    kind: 'install' | 'update'
  } | null>(null)
  const [queuedNoticeGame, setQueuedNoticeGame] = useState<GameInfo | null>(
    null
  )

  const { connected: gamepadConnected, layout: controllerLayout } =
    useGamepadInfo()
  const backButtonLabel = getBackButtonLabel(controllerLayout)
  const actionButtonLabel = getActionButtonLabel(controllerLayout)

  const cardRefs = useRef<Array<HTMLButtonElement | null>>([])
  const gridRef = useRef<HTMLDivElement | null>(null)
  const topBarRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    window.api.setFullscreen(true)
    if (
      !refreshing &&
      epic.library.length === 0 &&
      gog.library.length === 0 &&
      amazon.library.length === 0 &&
      zoom.library.length === 0
    ) {
      void refreshLibrary({ runInBackground: true })
    }
    return () => {
      window.api.setFullscreen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allGames = useMemo<GameInfo[]>(() => {
    const all: GameInfo[] = [
      ...epic.library,
      ...gog.library,
      ...amazon.library,
      ...zoom.library,
      ...sideloadedLibrary
    ]
    return all.filter((g) => !g.install?.is_dlc && !g.thirdPartyManagedApp)
  }, [
    epic.library,
    gog.library,
    amazon.library,
    zoom.library,
    sideloadedLibrary
  ])

  const visibleGames = useMemo(() => {
    // reset card refs to rebuild them
    cardRefs.current = []

    let filteredGames = allGames

    if (filteringByInstalled) {
      filteredGames = filteredGames.filter((g) => g.is_installed)
    }

    if (activeStore !== 'all') {
      filteredGames = filteredGames.filter((g) => g.runner === activeStore)
    }

    return filteredGames.sort((a, b) => {
      const cmp = a.title.localeCompare(b.title)
      return ascending ? cmp : -cmp
    })
  }, [allGames, filteringByInstalled, activeStore, ascending])

  const storesWithGames = useMemo(() => {
    const set = new Set<Runner>()
    for (const g of allGames) set.add(g.runner)
    return set
  }, [allGames])

  const storeFilters = useMemo<
    { key: StoreKey; label: string; enabled: boolean }[]
  >(
    () => [
      {
        key: 'all',
        label: t('console.filter.all', 'All'),
        enabled: allGames.length > 0
      },
      {
        key: 'legendary',
        label: 'Epic',
        enabled: storesWithGames.has('legendary')
      },
      { key: 'gog', label: 'GOG', enabled: storesWithGames.has('gog') },
      { key: 'nile', label: 'Amazon', enabled: storesWithGames.has('nile') },
      {
        key: 'sideload',
        label: t('console.filter.sideload', 'Other'),
        enabled: storesWithGames.has('sideload')
      },
      { key: 'zoom', label: 'ZOOM', enabled: storesWithGames.has('zoom') }
    ],
    [t, storesWithGames, allGames.length]
  )

  const enabledStoreKeys = useMemo(
    () => storeFilters.filter((f) => f.enabled).map((f) => f.key),
    [storeFilters]
  )

  useEffect(() => {
    if (activeStore !== 'all' && !enabledStoreKeys.includes(activeStore)) {
      setActiveStore('all')
    }
  }, [enabledStoreKeys, activeStore])

  const columns = useColumnCount(cardRefs, visibleGames.length)

  useEffect(() => {
    // always make sane focused index
    if (focusedIndex >= visibleGames.length || focusedIndex < 0) {
      setFocusedIndex(
        Math.max(0, Math.min(focusedIndex, visibleGames.length - 1))
      )
    }
  }, [visibleGames.length, focusedIndex])

  useEffect(() => {
    const btn = cardRefs.current[focusedIndex]
    if (!btn) return
    if (document.activeElement !== btn) {
      btn.focus({ preventScroll: true })
    }
    btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focusedIndex, visibleGames.length])

  const cycleStore = useCallback(
    (direction: 1 | -1) => {
      if (enabledStoreKeys.length === 0) return
      const idx = enabledStoreKeys.indexOf(activeStore)
      const next =
        (idx + direction + enabledStoreKeys.length) % enabledStoreKeys.length
      setActiveStore(enabledStoreKeys[next])
    },
    [enabledStoreKeys, activeStore]
  )

  const quit = useCallback(() => navigate('/'), [navigate])

  const idle =
    !launchingGame &&
    !installingGame &&
    !updateNoticeGame &&
    !cancelDownloadGame &&
    !queuedNoticeGame

  const activateGame = useCallback(
    (game: GameInfo) => {
      if (!idle) return
      const status = libraryStatus.find(
        (g) => g.appName === game.app_name
      )?.status
      if (status === 'queued') {
        setQueuedNoticeGame(game)
        return
      }
      if (status === 'installing') {
        setCancelDownloadGame({ game, kind: 'install' })
        return
      }
      if (status === 'updating') {
        setCancelDownloadGame({ game, kind: 'update' })
        return
      }
      if (!game.is_installed) {
        setInstallingGame(game)
        return
      }
      if (gameUpdates.includes(game.app_name)) {
        setUpdateNoticeGame(game)
        return
      }
      setLaunchingGame(game)
    },
    [idle, libraryStatus, gameUpdates]
  )

  const handleUpdateFromNotice = useCallback(() => {
    if (!updateNoticeGame) return
    const game = updateNoticeGame
    setUpdateNoticeGame(null)
    if (game.runner !== 'sideload') {
      void updateGame({
        appName: game.app_name,
        runner: game.runner as Runner,
        gameInfo: game
      })
    }
  }, [updateNoticeGame])

  const handleLaunchWithoutUpdate = useCallback(() => {
    if (!updateNoticeGame) return
    const game = updateNoticeGame
    setUpdateNoticeGame(null)
    setLaunchingGame(game)
  }, [updateNoticeGame])

  const dismissUpdateNotice = useCallback(() => setUpdateNoticeGame(null), [])

  const handleCancelDownload = useCallback(() => {
    if (!cancelDownloadGame) return
    const { game } = cancelDownloadGame
    setCancelDownloadGame(null)
    void sendKill(game.app_name, game.runner)
  }, [cancelDownloadGame])

  const dismissCancelDownload = useCallback(
    () => setCancelDownloadGame(null),
    []
  )

  const handleRemoveFromQueue = useCallback(() => {
    if (!queuedNoticeGame) return
    const game = queuedNoticeGame
    setQueuedNoticeGame(null)
    window.localStorage.removeItem(game.app_name)
    void window.api.removeFromDMQueue(game.app_name)
  }, [queuedNoticeGame])

  const dismissQueuedNotice = useCallback(() => setQueuedNoticeGame(null), [])

  const onTopBarKeyDown = (e: React.KeyboardEvent) => {
    if (!idle) return
    const root = topBarRef.current
    if (!root) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      cardRefs.current[focusedIndex]?.focus()
      return
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const btns = Array.from(
        root.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
      )
      const active = document.activeElement as HTMLButtonElement | null
      const idx = active ? btns.indexOf(active) : -1
      if (idx === -1 || btns.length === 0) return
      e.preventDefault()
      e.stopPropagation()
      const delta = e.key === 'ArrowRight' ? 1 : -1
      const next = (idx + delta + btns.length) % btns.length
      btns[next].focus()
    }
  }

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    if (visibleGames.length === 0 || !idle) return
    const last = visibleGames.length - 1

    if (e.key === 'ArrowRight') {
      e.preventDefault()
      e.stopPropagation()
      setFocusedIndex((i) => Math.min(i + 1, last))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      e.stopPropagation()
      setFocusedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      setFocusedIndex((i) => Math.min(i + columns, last))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      e.stopPropagation()
      if (focusedIndex < columns) {
        const first = topBarRef.current?.querySelector<HTMLButtonElement>(
          'button:not(:disabled)'
        )
        first?.focus()
      } else {
        setFocusedIndex((i) => Math.max(i - columns, 0))
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const g = visibleGames[focusedIndex]
      if (g) activateGame(g)
    }
  }

  // Esc quits when idle. While a game is launching or a dialog is open,
  // the overlay/dialog handles Esc itself.
  useEffect(() => {
    if (!idle) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      quit()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [quit, idle])

  // Read by gamepad.ts to block the Guide/back buttons during launch.
  useEffect(() => {
    if (!launchingGame) return
    document.body.classList.add('console-launching')
    return () => document.body.classList.remove('console-launching')
  }, [launchingGame])

  const toggleSort = useCallback(() => setAscending((v) => !v), [])

  useGamepadButtonPress(BTN_L1, () => cycleStore(-1), idle)
  useGamepadButtonPress(BTN_R1, () => cycleStore(1), idle)
  useGamepadButtonPress(BTN_R2, toggleSort, idle)

  return (
    <div className={classNames('ConsoleMode', { launching: !!launchingGame })}>
      <div
        className="consoleTopBar"
        ref={topBarRef}
        onKeyDown={onTopBarKeyDown}
      >
        <HeroicIcon className="consoleLogo" />
        <div className="consoleFilters">
          <button
            key={'installedGames'}
            className={classNames('consoleChip', {
              active: filteringByInstalled
            })}
            onClick={() => setFilteringByInstalled(!filteringByInstalled)}
          >
            {t('status.installed', 'Installed')}
          </button>
          <div className="consoleDividerVertical" />
          {storeFilters
            .filter((f) => f.enabled)
            .map((f) => (
              <button
                key={f.key}
                className={classNames('consoleChip', {
                  active: activeStore === f.key
                })}
                onClick={() => setActiveStore(f.key)}
                disabled={!!launchingGame}
              >
                {f.label}
              </button>
            ))}
        </div>
        <div className="consoleTopRight">
          <button
            className="consoleChip"
            onClick={toggleSort}
            aria-label={t('console.sort', 'Sort')}
            disabled={!!launchingGame}
          >
            {ascending ? 'A → Z' : 'Z → A'}
          </button>
          <button
            className="consoleQuitButton"
            onClick={quit}
            disabled={!!launchingGame}
          >
            {t('console.quit', 'Quit Console')}
          </button>
          <button
            className="consoleQuitButton danger"
            onClick={() => window.api.quit()}
            disabled={!!launchingGame}
          >
            {t('console.quitApp', 'Quit App')}
          </button>
        </div>
      </div>

      <div className="consoleTitleBar">
        {visibleGames[focusedIndex] && (
          <h1 className="consoleFocusTitle">
            {visibleGames[focusedIndex].title}
          </h1>
        )}
      </div>

      <div className="consoleStage">
        {visibleGames.length === 0 ? (
          <div className="consoleEmpty">
            {refreshing
              ? t('console.loading', 'Loading your library…')
              : t(
                  'console.empty',
                  'No installed games to show. Install something first.'
                )}
          </div>
        ) : (
          <div
            className="consoleGridScroller"
            ref={gridRef}
            role="listbox"
            aria-label={t('console.games', 'Installed games')}
            onKeyDown={onGridKeyDown}
          >
            <div className="consoleGrid">
              {visibleGames.map((game, i) => {
                const isFocused = i === focusedIndex
                return (
                  <ConsoleCard
                    key={`${game.runner}-${game.app_name}`}
                    ref={(el) => {
                      cardRefs.current[i] = el
                    }}
                    game={game}
                    focused={isFocused}
                    needsUpdate={gameUpdates.includes(game.app_name)}
                    onClick={() => {
                      if (isFocused) activateGame(game)
                      else setFocusedIndex(i)
                    }}
                    onMouseEnter={() => setFocusedIndex(i)}
                    onFocus={() => setFocusedIndex(i)}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="consoleFooter">
        {gamepadConnected && !launchingGame && (
          <ControllerHints layout={controllerLayout} />
        )}
      </div>

      {launchingGame && (
        <LaunchOverlay
          game={launchingGame}
          onDismiss={() => setLaunchingGame(null)}
        />
      )}

      {installingGame && (
        <InstallOverlay
          game={installingGame}
          onDismiss={() => setInstallingGame(null)}
        />
      )}

      {updateNoticeGame && (
        <ConfirmDialog
          title={t('gamepage:box.update.title')}
          message={t('gamepage:box.update.message')}
          gameTitle={updateNoticeGame.title}
          confirmLabel={t('gamepage:box.yes')}
          cancelLabel={t('gamepage:box.no')}
          dismissLabel={t('button.cancel', 'Cancel')}
          onConfirm={handleUpdateFromNotice}
          onCancel={handleLaunchWithoutUpdate}
          onDismiss={dismissUpdateNotice}
          gamepadConnected={gamepadConnected}
          backButtonLabel={backButtonLabel}
          actionButtonLabel={actionButtonLabel}
        />
      )}

      {cancelDownloadGame && (
        <ConfirmDialog
          title={CANCEL_DOWNLOAD_COPY[cancelDownloadGame.kind].title(t)}
          message={CANCEL_DOWNLOAD_COPY[cancelDownloadGame.kind].message(t)}
          gameTitle={cancelDownloadGame.game.title}
          confirmLabel={t('gamepage:box.yes')}
          cancelLabel={t('gamepage:box.no')}
          onConfirm={handleCancelDownload}
          onCancel={dismissCancelDownload}
          gamepadConnected={gamepadConnected}
          backButtonLabel={backButtonLabel}
          actionButtonLabel={actionButtonLabel}
        />
      )}

      {queuedNoticeGame && (
        <ConfirmDialog
          title={t('gamepage:button.queue.remove')}
          message={t(
            'console.removeFromQueue.message',
            'This game is queued for download. Remove it from the queue?'
          )}
          gameTitle={queuedNoticeGame.title}
          confirmLabel={t('gamepage:box.yes')}
          cancelLabel={t('gamepage:box.no')}
          onConfirm={handleRemoveFromQueue}
          onCancel={dismissQueuedNotice}
          gamepadConnected={gamepadConnected}
          backButtonLabel={backButtonLabel}
          actionButtonLabel={actionButtonLabel}
        />
      )}
    </div>
  )
}
