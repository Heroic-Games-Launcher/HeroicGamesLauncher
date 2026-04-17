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
import { launch } from 'frontend/helpers'
import { getImageFormatting } from '../Library/components/GameCard/constants'
import { CachedImage } from 'frontend/components/UI'
import fallBackImage from 'frontend/assets/heroic_card.jpg'
import HeroicIcon from 'frontend/assets/heroic-icon.svg?react'

import type { GameInfo, Runner } from 'common/types'

type StoreKey = 'all' | 'legendary' | 'gog' | 'nile' | 'sideload' | 'zoom'

const runnerToStore: Record<string, StoreKey> = {
  legendary: 'legendary',
  gog: 'gog',
  nile: 'nile',
  sideload: 'sideload',
  zoom: 'zoom'
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

  const cardRefs = useRef<Array<HTMLButtonElement | null>>([])
  const gridRef = useRef<HTMLDivElement | null>(null)

  // enter fullscreen on mount, leave on unmount. Also make sure library data
  // is available — on a cold start the user may reach /console before the
  // initial refresh has populated epic/gog/amazon. refreshLibrary is idempotent
  // (guards internally against re-entry).
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
    // run once on mount
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

  // keep focus index in bounds when filters change
  useEffect(() => {
    if (focusedIndex >= visibleGames.length) {
      setFocusedIndex(Math.max(0, visibleGames.length - 1))
    }
  }, [visibleGames.length, focusedIndex])

  // detect columns per row by measuring which cards share the same offsetTop.
  // Re-runs whenever the grid or visibleGames change and on window resize.
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

  // move real DOM focus onto the focused card so gamepad/keyboard Enter
  // activates the right button and arrow keys read the correct element.
  // Also scrolls it into view so rows above/below are reachable.
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

  // Escape exits console mode (ignored while launching so the overlay stays)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !launchingGame) {
        e.preventDefault()
        quit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [quit, launchingGame])

  return (
    <div
      className={classNames('ConsoleMode', { launching: !!launchingGame })}
    >
      <div className="consoleTopBar">
        <HeroicIcon className="consoleLogo" />
        <div className="consoleFilters">
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
            onClick={() => setAscending((v) => !v)}
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
            className="consoleGrid"
            ref={gridRef}
            role="listbox"
            aria-label={t('console.games', 'Installed games')}
            onKeyDown={onGridKeyDown}
          >
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
        <div className="consoleLaunchOverlay" role="status" aria-live="polite">
          <div className="consoleLaunchSpinner" />
          <div className="consoleLaunchText">
            {t('console.launching', 'Launching')}
          </div>
          <div className="consoleLaunchGameTitle">{launchingGame.title}</div>
        </div>
      )}
    </div>
  )
}
