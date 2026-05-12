import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'

import './index.scss'

import { install, writeConfig } from 'frontend/helpers'
import { hasProgress } from 'frontend/hooks/hasProgress'
import ContextProvider from 'frontend/state/ContextProvider'

import type {
  GameInfo,
  InstallPlatform,
  WineInstallation
} from 'common/types'

import { BTN_ACTION, BTN_BACK } from '../controller'
import { useGamepadButtonPress } from '../hooks'

type PlatformOption = {
  value: InstallPlatform
  label: string
}

type FocusKey = 'platform' | 'wine' | 'cancel' | 'install'

export default function InstallOverlay({
  game,
  onDismiss
}: {
  game: GameInfo
  onDismiss: () => void
}) {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const [progress] = hasProgress(game.app_name, game.runner)

  const isWin = platform === 'win32'
  const isMac = platform === 'darwin'
  const isLinux = platform === 'linux'
  const isSideload = game.runner === 'sideload'

  const availablePlatforms = useMemo<PlatformOption[]>(() => {
    const options: PlatformOption[] = []
    if (isLinux && (isSideload || game.is_linux_native)) {
      options.push({ value: 'linux', label: 'Linux' })
    }
    if (isMac && (isSideload || game.is_mac_native)) {
      options.push({ value: 'Mac', label: 'macOS' })
    }
    // Windows is always installable (via Wine/Proton when not on Windows).
    options.push({ value: 'Windows', label: 'Windows' })
    return options
  }, [isLinux, isMac, isSideload, game.is_linux_native, game.is_mac_native])

  const defaultPlatform: InstallPlatform =
    (isMac && game.is_mac_native && 'Mac') ||
    (isLinux && game.is_linux_native && 'linux') ||
    'Windows'

  const [platformIndex, setPlatformIndex] = useState(() => {
    const idx = availablePlatforms.findIndex((p) => p.value === defaultPlatform)
    return idx >= 0 ? idx : 0
  })
  const platformToInstall =
    availablePlatforms[platformIndex]?.value ?? 'Windows'
  const hasWine = platformToInstall === 'Windows' && !isWin

  const [wineList, setWineList] = useState<WineInstallation[]>([])
  const [wineIndex, setWineIndex] = useState(0)
  const wineVersion = hasWine ? wineList[wineIndex] : undefined

  const [installPath, setInstallPath] = useState<string>('')

  // The currently focused row. Up/Down cycle through visible rows; Left/Right
  // cycle the focused selector value or switch between the two action buttons.
  const [focused, setFocused] = useState<FocusKey>('install')
  const installButtonRef = useRef<HTMLButtonElement | null>(null)
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    let cancelled = false
    void window.api.requestAppSettings().then((settings) => {
      if (!cancelled) setInstallPath(settings.defaultInstallPath)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hasWine) {
      setWineList([])
      setWineIndex(0)
      return
    }
    let cancelled = false
    void window.api.getAlternativeWine().then((list) => {
      if (cancelled) return
      setWineList(list)
      setWineIndex(0)
    })
    return () => {
      cancelled = true
    }
  }, [hasWine])

  const visibleRows = useMemo<FocusKey[]>(() => {
    const rows: FocusKey[] = []
    if (availablePlatforms.length > 1) rows.push('platform')
    if (hasWine) rows.push('wine')
    rows.push('cancel', 'install')
    return rows
  }, [availablePlatforms.length, hasWine])

  // Drop focus back onto a visible row if the previously focused one is gone
  // (e.g. switching platform away from Windows hides the wine row).
  useEffect(() => {
    if (!visibleRows.includes(focused)) setFocused('install')
  }, [visibleRows, focused])

  useEffect(() => {
    const btn =
      focused === 'install'
        ? installButtonRef.current
        : focused === 'cancel'
          ? cancelButtonRef.current
          : null
    btn?.focus({ preventScroll: true })
  }, [focused])

  const cyclePlatform = (delta: 1 | -1) => {
    setPlatformIndex(
      (i) =>
        (i + delta + availablePlatforms.length) % availablePlatforms.length
    )
  }

  const cycleWine = (delta: 1 | -1) => {
    if (wineList.length === 0) return
    setWineIndex((i) => (i + delta + wineList.length) % wineList.length)
  }

  const installGame = async () => {
    try {
      if (!isWin && wineVersion) {
        const gameSettings = await window.api.requestGameSettings(game.app_name)
        await writeConfig({
          appName: game.app_name,
          config: { ...gameSettings, wineVersion }
        })
      }
      void install({
        gameInfo: game,
        previousProgress: null,
        progress,
        installPath: installPath || 'default',
        isInstalling: false,
        platformToInstall,
        t,
        showDialogModal: () => null
      })
      onDismiss()
    } catch (err) {
      window.api.logError(`Console Mode install failed: ${String(err)}`)
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        onDismiss()
        return
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        const idx = visibleRows.indexOf(focused)
        if (idx === -1) return
        const delta = e.key === 'ArrowDown' ? 1 : -1
        const next =
          (idx + delta + visibleRows.length) % visibleRows.length
        setFocused(visibleRows[next])
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const delta = e.key === 'ArrowRight' ? 1 : -1
        if (focused === 'platform') {
          e.preventDefault()
          e.stopPropagation()
          cyclePlatform(delta)
          return
        }
        if (focused === 'wine') {
          e.preventDefault()
          e.stopPropagation()
          cycleWine(delta)
          return
        }
        if (focused === 'cancel' || focused === 'install') {
          e.preventDefault()
          e.stopPropagation()
          setFocused(focused === 'install' ? 'cancel' : 'install')
        }
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        if (focused === 'install') {
          e.preventDefault()
          void installGame()
        } else if (focused === 'cancel') {
          e.preventDefault()
          onDismiss()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, visibleRows, availablePlatforms.length, wineList.length])

  useGamepadButtonPress(BTN_ACTION, () => {
    if (focused === 'install') void installGame()
    else if (focused === 'cancel') onDismiss()
  })
  useGamepadButtonPress(BTN_BACK, onDismiss)

  const showPlatform = availablePlatforms.length > 1
  const wineLabel =
    wineList.length > 0
      ? (wineVersion?.name ?? t('console.install.wineMissing', 'Not selected'))
      : t('console.install.wineLoading', 'Loading…')

  return (
    <div className="consoleInstallOverlay" role="dialog" aria-live="polite">
      <div className="consoleModal">
        <div className="consoleModalTitle">
          {t('console.install.title', 'Install game')}
        </div>
        <div className="consoleModalGameTitle">{game.title}</div>

        <div className="consoleInstallFields">
          {showPlatform && (
            <SelectorRow
              focused={focused === 'platform'}
              onFocus={() => setFocused('platform')}
              label={t('console.install.platform', 'Platform')}
              value={availablePlatforms[platformIndex]?.label ?? ''}
              onPrev={() => cyclePlatform(-1)}
              onNext={() => cyclePlatform(1)}
            />
          )}
          {hasWine && (
            <SelectorRow
              focused={focused === 'wine'}
              onFocus={() => setFocused('wine')}
              label={t('console.install.wine', 'Wine')}
              value={wineLabel}
              onPrev={() => cycleWine(-1)}
              onNext={() => cycleWine(1)}
              disabled={wineList.length <= 1}
            />
          )}
          <div className="consoleInstallRow">
            <span className="consoleInstallLabel">
              {t('console.install.path', 'Install to')}
            </span>
            <span className="consoleInstallPath" title={installPath}>
              {installPath || '…'}
            </span>
          </div>
        </div>

        <div className="consoleInstallButtons">
          <button
            ref={cancelButtonRef}
            className={classNames('consoleChip', {
              active: focused === 'cancel'
            })}
            onClick={onDismiss}
            onMouseEnter={() => setFocused('cancel')}
            onFocus={() => setFocused('cancel')}
          >
            {t('button.cancel', 'Cancel')}
          </button>
          <button
            ref={installButtonRef}
            className={classNames('consoleChip', {
              active: focused === 'install'
            })}
            onClick={() => void installGame()}
            onMouseEnter={() => setFocused('install')}
            onFocus={() => setFocused('install')}
            disabled={hasWine && !wineVersion}
          >
            {t('generic.install', 'Install')}
          </button>
        </div>
      </div>
    </div>
  )
}

function SelectorRow({
  focused,
  onFocus,
  label,
  value,
  onPrev,
  onNext,
  disabled
}: {
  focused: boolean
  onFocus: () => void
  label: string
  value: string
  onPrev: () => void
  onNext: () => void
  disabled?: boolean
}) {
  return (
    <div
      className={classNames('consoleInstallRow consoleInstallSelector', {
        focused
      })}
      role="group"
      onMouseEnter={onFocus}
    >
      <span className="consoleInstallLabel">{label}</span>
      <div className="consoleInstallSelectorControl">
        <button
          type="button"
          className="consoleInstallArrow"
          onClick={onPrev}
          disabled={disabled}
          aria-label="Previous"
          tabIndex={-1}
        >
          ‹
        </button>
        <span className="consoleInstallValue">{value}</span>
        <button
          type="button"
          className="consoleInstallArrow"
          onClick={onNext}
          disabled={disabled}
          aria-label="Next"
          tabIndex={-1}
        >
          ›
        </button>
      </div>
    </div>
  )
}
