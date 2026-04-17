import './index.scss'

import {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useCallback
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'

import ContextProvider from 'frontend/state/ContextProvider'
import { launch, sendKill } from 'frontend/helpers'
import { hasStatus } from 'frontend/hooks/hasStatus'
import { getImageFormatting } from '../Library/components/GameCard/constants'
import { CachedImage } from 'frontend/components/UI'
import fallBackImage from 'frontend/assets/heroic_card.jpg'
import HeroicIcon from 'frontend/assets/heroic-icon.svg?react'

import type { GameInfo, Runner } from 'common/types'

const CANCEL_HOLD_MS = 3000

type StoreKey = 'all' | 'legendary' | 'gog' | 'nile' | 'sideload' | 'zoom'

const runnerToStore: Record<string, StoreKey> = {
  legendary: 'legendary',
  gog: 'gog',
  nile: 'nile',
  sideload: 'sideload',
  zoom: 'zoom'
}

type ControllerLayout = 'ps' | 'xbox' | 'nintendo' | 'steam-deck'

function detectControllerLayout(id: string): ControllerLayout {
  if (/sony|054c|PS3|PLAYSTATION|0268|2563.*0523/i.test(id)) return 'ps'
  if (/28de.*11ff/.test(id)) return 'steam-deck'
  if (/microsoft|xbox/i.test(id)) return 'xbox'
  if (/nintendo|057e|switch|joy.?con|pro.?controller/i.test(id))
    return 'nintendo'
  return 'steam-deck'
}

const BUTTON_LABELS: Record<
  ControllerLayout,
  { shoulderL: string; shoulderR: string; triggerR: string; back: string }
> = {
  ps: { shoulderL: 'L1', shoulderR: 'R1', triggerR: 'R2', back: '◯' },
  xbox: { shoulderL: 'LB', shoulderR: 'RB', triggerR: 'RT', back: 'B' },
  nintendo: { shoulderL: 'L', shoulderR: 'R', triggerR: 'ZR', back: 'B' },
  'steam-deck': { shoulderL: 'L1', shoulderR: 'R1', triggerR: 'R2', back: 'B' }
}

export default function ConsoleMode() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    epic,
    gog,
    amazon,
    zoom,
    sideloadedLibrary,
    showDialogModal,
    refreshLibrary,
    refreshing
  } = useContext(ContextProvider)

  const [activeStore, setActiveStore] = useState<StoreKey>('all')
  const [ascending, setAscending] = useState(true)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [launchingGame, setLaunchingGame] = useState<GameInfo | null>(null)
  const [columns, setColumns] = useState(6)
  const [gamepadConnected, setGamepadConnected] = useState(false)
  const [controllerLayout, setControllerLayout] =
    useState<ControllerLayout>('steam-deck')
  const [cancelHoldStart, setCancelHoldStart] = useState<number | null>(null)

  const buttons = BUTTON_LABELS[controllerLayout]

  const cardRefs = useRef<Array<HTMLButtonElement | null>>([])
  const gridRef = useRef<HTMLDivElement | null>(null)

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

  const installedGames = useMemo<GameInfo[]>(() => {
    const all: GameInfo[] = [
      ...epic.library,
      ...gog.library,
      ...amazon.library,
      ...zoom.library,
      ...sideloadedLibrary
    ]
    return all.filter(
      (g) => g?.is_installed && !g.install?.is_dlc && !g.thirdPartyManagedApp
    )
  }, [
    epic.library,
    gog.library,
    amazon.library,
    zoom.library,
    sideloadedLibrary
  ])

  const visibleGames = useMemo(() => {
    let list = installedGames
    if (activeStore !== 'all') {
      list = list.filter((g) => runnerToStore[g.runner] === activeStore)
    }
    list = [...list].sort((a, b) => {
      const cmp = a.title.localeCompare(b.title)
      return ascending ? cmp : -cmp
    })
    return list
  }, [installedGames, activeStore, ascending])

  useEffect(() => {
    if (focusedIndex >= visibleGames.length) {
      setFocusedIndex(Math.max(0, visibleGames.length - 1))
    }
  }, [visibleGames.length, focusedIndex])

  useLayoutEffect(() => {
    const compute = () => {
      const cards = cardRefs.current.filter(
        (el): el is HTMLButtonElement => !!el
      )
      if (cards.length < 2) {
        setColumns(1)
        return
      }
      const firstTop = cards[0].offsetTop
      let count = 1
      for (let i = 1; i < cards.length; i++) {
        if (cards[i].offsetTop !== firstTop) break
        count++
      }
      setColumns(Math.max(1, count))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [visibleGames.length])

  useEffect(() => {
    const btn = cardRefs.current[focusedIndex]
    if (!btn) return
    if (document.activeElement !== btn) {
      btn.focus({ preventScroll: true })
    }
    btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [focusedIndex, visibleGames.length])

  const storeFilters: { key: StoreKey; label: string; enabled: boolean }[] = [
    { key: 'all', label: t('console.filter.all', 'All'), enabled: true },
    {
      key: 'legendary',
      label: t('console.filter.epic', 'Epic'),
      enabled: !!epic.username
    },
    {
      key: 'gog',
      label: t('console.filter.gog', 'GOG'),
      enabled: !!gog.username
    },
    {
      key: 'nile',
      label: t('console.filter.amazon', 'Amazon'),
      enabled: !!amazon.user_id
    },
    {
      key: 'sideload',
      label: t('console.filter.sideload', 'Other'),
      enabled: true
    },
    {
      key: 'zoom',
      label: t('console.filter.zoom', 'ZOOM'),
      enabled: !!zoom.username
    }
  ]

  const enabledStoreKeys = useMemo(
    () => storeFilters.filter((f) => f.enabled).map((f) => f.key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [epic.username, gog.username, amazon.user_id, zoom.username]
  )

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

  const launchGame = useCallback(
    async (game: GameInfo) => {
      if (launchingGame) return
      setLaunchingGame(game)
      try {
        await launch({
          appName: game.app_name,
          t,
          runner: game.runner as Runner,
          hasUpdate: false,
          showDialogModal
        })
      } finally {
        setLaunchingGame(null)
      }
    },
    [launchingGame, showDialogModal, t]
  )

  const onGridKeyDown = (e: React.KeyboardEvent) => {
    if (visibleGames.length === 0 || launchingGame) return
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
      setFocusedIndex((i) => Math.max(i - columns, 0))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const g = visibleGames[focusedIndex]
      if (g) void launchGame(g)
    }
  }

  // Escape quits when idle; hold it while launching to cancel.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      if (!launchingGame) {
        quit()
      } else if (!e.repeat && cancelHoldStart == null) {
        setCancelHoldStart(Date.now())
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCancelHoldStart(null)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [quit, launchingGame, cancelHoldStart])

  useEffect(() => {
    if (cancelHoldStart == null || !launchingGame) return
    const t = window.setTimeout(() => {
      void sendKill(launchingGame.app_name, launchingGame.runner)
      setCancelHoldStart(null)
    }, CANCEL_HOLD_MS)
    return () => window.clearTimeout(t)
  }, [cancelHoldStart, launchingGame])

  useEffect(() => {
    if (!launchingGame) setCancelHoldStart(null)
  }, [launchingGame])

  // Read by gamepad.ts to block the Guide/back buttons during launch.
  useEffect(() => {
    if (launchingGame) {
      document.body.classList.add('console-launching')
      return () => document.body.classList.remove('console-launching')
    }
    return undefined
  }, [launchingGame])

  // Refs so the RAF poll below never re-subscribes — otherwise a changing
  // `cycleStore` identity would reset rising-edge state mid-press.
  const cycleStoreRef = useRef(cycleStore)
  cycleStoreRef.current = cycleStore
  const launchingRef = useRef(!!launchingGame)
  launchingRef.current = !!launchingGame

  useEffect(() => {
    const refreshConnection = () => {
      const gamepads = Array.from(navigator.getGamepads())
      const first = gamepads.find((gp): gp is Gamepad => !!gp)
      setGamepadConnected(!!first)
      if (first) setControllerLayout(detectControllerLayout(first.id))
    }
    refreshConnection()
    window.addEventListener('gamepadconnected', refreshConnection)
    window.addEventListener('gamepaddisconnected', refreshConnection)

    const prevPressed = new Map<string, boolean>()
    let anyBackHeld = false
    let raf = 0
    const tick = () => {
      const gamepads = navigator.getGamepads()
      let backHeldThisFrame = false
      for (const gp of gamepads) {
        if (!gp) continue

        const press = (idx: number, handler: () => void) => {
          const btn = gp.buttons[idx]
          const pressed = !!btn && (btn.pressed || btn.value > 0.5)
          const key = `${gp.index}:${idx}`
          if (pressed && !prevPressed.get(key)) handler()
          prevPressed.set(key, pressed)
        }

        if (!launchingRef.current) {
          press(4, () => cycleStoreRef.current(-1)) // L1
          press(5, () => cycleStoreRef.current(1)) // R1
          press(7, () => setAscending((v) => !v)) // R2
          press(10, () => cycleStoreRef.current(-1)) // L3
          press(11, () => cycleStoreRef.current(1)) // R3
        } else {
          const back = gp.buttons[1]
          if (back && (back.pressed || back.value > 0.5)) {
            backHeldThisFrame = true
          }
        }
      }

      if (backHeldThisFrame && !anyBackHeld && launchingRef.current) {
        setCancelHoldStart(Date.now())
      } else if (!backHeldThisFrame && anyBackHeld) {
        setCancelHoldStart(null)
      }
      anyBackHeld = backHeldThisFrame

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('gamepadconnected', refreshConnection)
      window.removeEventListener('gamepaddisconnected', refreshConnection)
    }
  }, [])

  return (
    <div
      className={classNames('ConsoleMode', { launching: !!launchingGame })}
    >
      <div className="consoleTopBar">
        <HeroicIcon className="consoleLogo" />
        <div className="consoleFilters">
          {gamepadConnected && (
            <span
              className="consoleHint consoleHintLeft"
              aria-hidden="true"
              title={t('console.hint.cycleStorePrev', 'Previous store')}
            >
              <kbd>{buttons.shoulderL}</kbd>
            </span>
          )}
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
          {gamepadConnected && (
            <span
              className="consoleHint consoleHintRight"
              aria-hidden="true"
              title={t('console.hint.cycleStoreNext', 'Next store')}
            >
              <kbd>{buttons.shoulderR}</kbd>
            </span>
          )}
        </div>
        <div className="consoleTopRight">
          <button
            className="consoleChip consoleSortChip"
            onClick={() => setAscending((v) => !v)}
            aria-label={t('console.sort', 'Sort')}
            disabled={!!launchingGame}
          >
            {ascending ? 'A → Z' : 'Z → A'}
            {gamepadConnected && (
              <span className="consoleChipHint" aria-hidden="true">
                <kbd>{buttons.triggerR}</kbd>
              </span>
            )}
          </button>
          <button
            className="consoleQuitButton"
            onClick={quit}
            disabled={!!launchingGame}
          >
            {t('console.quit', 'Quit Console')}
          </button>
        </div>
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
                <button
                  key={`${game.runner}-${game.app_name}`}
                  ref={(el) => {
                    cardRefs.current[i] = el
                  }}
                  className={classNames('consoleCard', { focused: isFocused })}
                  tabIndex={isFocused ? 0 : -1}
                  onClick={() => {
                    if (isFocused) void launchGame(game)
                    else setFocusedIndex(i)
                  }}
                  onMouseEnter={() => setFocusedIndex(i)}
                  onFocus={() => setFocusedIndex(i)}
                >
                  <CachedImage
                    src={
                      getImageFormatting(game.art_square, game.runner) ||
                      fallBackImage
                    }
                    alt={game.title}
                    className="consoleCardArt"
                  />
                </button>
              )
            })}
            </div>
          </div>
        )}
      </div>

      <div className="consoleFooter">
        {visibleGames[focusedIndex] && (
          <h1 className="consoleFocusTitle">
            {visibleGames[focusedIndex].title}
          </h1>
        )}
      </div>

      {launchingGame && (
        <LaunchOverlay
          game={launchingGame}
          holdStart={cancelHoldStart}
          gamepadConnected={gamepadConnected}
          backButtonLabel={buttons.back}
        />
      )}
    </div>
  )
}

function LaunchOverlay({
  game,
  holdStart,
  gamepadConnected,
  backButtonLabel
}: {
  game: GameInfo
  holdStart: number | null
  gamepadConnected: boolean
  backButtonLabel: string
}) {
  const { t } = useTranslation()
  const { label, status } = hasStatus(game)
  return (
    <div className="consoleLaunchOverlay" role="status" aria-live="polite">
      <div
        className={classNames('consoleLaunchSpinner', {
          idle: status === 'playing'
        })}
      />
      <div className="consoleLaunchText">
        {label || t('console.launching', 'Launching')}
      </div>
      <div className="consoleLaunchGameTitle">{game.title}</div>
      <div
        className={classNames('consoleLaunchHint', {
          active: holdStart != null
        })}
      >
        {t('console.cancel.hintPrefix', 'Hold')}{' '}
        <kbd>{gamepadConnected ? backButtonLabel : 'Esc'}</kbd>{' '}
        {t('console.cancel.hintSuffix', 'for 3s to cancel')}
      </div>
    </div>
  )
}
