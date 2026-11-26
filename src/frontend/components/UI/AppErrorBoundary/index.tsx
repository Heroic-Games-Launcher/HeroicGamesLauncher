import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  isRouteErrorResponse,
  useLocation,
  useNavigate,
  useRouteError
} from 'react-router-dom'
import {
  Copy,
  ExternalLink,
  FileText,
  FolderOpen,
  RefreshCw,
  RotateCcw,
  TriangleAlert
} from 'lucide-react'

import Button from '../Button'
import Icon from '../Icon'
import Panel from '../Panel'
import './index.css'

const GITHUB_NEW_ISSUE_URL =
  'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/issues/new?template=bug_report.yaml'

type ErrorInfo = {
  name: string
  message: string
  stack: string
}

type CopyTarget = 'report' | 'log'

type Feedback = {
  tone: 'success' | 'error'
  message: string
}

function safeStringify(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    // Circular or otherwise unserializable values
    return Object.prototype.toString.call(value)
  }
}

function normalizeError(error: unknown): ErrorInfo {
  if (isRouteErrorResponse(error)) {
    return {
      name: `HTTP ${error.status}`,
      message: safeStringify(error.data) || error.statusText || 'Unknown error',
      stack: ''
    }
  }

  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || safeStringify(error) || 'Unknown error',
      stack: error.stack ?? ''
    }
  }

  return {
    name: 'Error',
    message: safeStringify(error) || 'Unknown error',
    stack: ''
  }
}

async function writeToClipboard(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch {
    // Fall through to the Electron clipboard, which does not need a
    // permission prompt and works even when the document is not focused.
  }

  window.api?.clipboardWriteText?.(text)
}

async function readHeroicLog(): Promise<string> {
  try {
    return (await window.api?.getLogContent?.({})) ?? ''
  } catch {
    return ''
  }
}

async function readSystemInfo(): Promise<string> {
  try {
    const info = await window.api?.systemInfo?.get?.(false)
    return info ? JSON.stringify(info, null, 2) : ''
  } catch {
    return ''
  }
}

interface AppErrorScreenProps {
  error: unknown
  route?: string
  onGoToLibrary?: () => void
}

/**
 * Full-screen crash screen shown when a route throws during render. It exposes
 * everything needed to file a usable bug report: the error itself, the route
 * and version it happened on, and one-click access to Heroic's log.
 */
export function AppErrorScreen({
  error,
  route,
  onGoToLibrary
}: AppErrorScreenProps) {
  const { t } = useTranslation()
  const [heroicVersion, setHeroicVersion] = useState('')
  const [busy, setBusy] = useState<CopyTarget | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const [occurredAt] = useState(() => new Date().toISOString())

  const errorInfo = useMemo(() => normalizeError(error), [error])

  useEffect(() => {
    let cancelled = false

    Promise.resolve(window.api?.getHeroicVersion?.())
      .then((version) => {
        if (!cancelled && typeof version === 'string') {
          setHeroicVersion(version)
        }
      })
      .catch(() => {
        // The version is a nice-to-have, never block the screen on it
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Make sure the crash also ends up in the log, even if the user never
  // copies anything before closing Heroic.
  useEffect(() => {
    try {
      window.api?.logError?.(
        [
          'Unexpected application error',
          `Route: ${route || 'unknown'}`,
          `Heroic version: ${heroicVersion || 'unknown'}`,
          `${errorInfo.name}: ${errorInfo.message}`,
          errorInfo.stack
        ]
          .filter(Boolean)
          .join('\n')
      )
    } catch {
      // The error boundary must never throw while reporting an error
    }
  }, [route, heroicVersion, errorInfo])

  const platform = useMemo(
    () =>
      typeof navigator === 'undefined'
        ? 'unknown'
        : `${navigator.platform || 'unknown'} — ${navigator.userAgent}`,
    []
  )

  const technicalDetails = useMemo(
    () =>
      [
        `Time: ${occurredAt}`,
        `Route: ${route || 'unknown'}`,
        `Heroic version: ${heroicVersion || 'unknown'}`,
        `Platform: ${platform}`,
        '',
        `${errorInfo.name}: ${errorInfo.message}`,
        errorInfo.stack ? `\nStack trace:\n${errorInfo.stack}` : ''
      ].join('\n'),
    [
      occurredAt,
      route,
      heroicVersion,
      platform,
      errorInfo.name,
      errorInfo.message,
      errorInfo.stack
    ]
  )

  const handleCopyReport = async () => {
    setBusy('report')
    setFeedback(null)

    try {
      const [log, systemInfo] = await Promise.all([
        readHeroicLog(),
        readSystemInfo()
      ])

      const report = [
        '=== Heroic Games Launcher error report ===',
        '',
        technicalDetails,
        '',
        '=== System information ===',
        systemInfo || '(unavailable)',
        '',
        '=== Heroic log ===',
        log || '(no log file found)'
      ].join('\n')

      await writeToClipboard(report)
      setFeedback({
        tone: 'success',
        message: t(
          'error.boundary.report-copied',
          'Error report copied to clipboard, including the Heroic log.'
        )
      })
    } catch {
      setFeedback({
        tone: 'error',
        message: t(
          'error.boundary.copy-failed',
          'Could not copy. Please try again.'
        )
      })
    } finally {
      setBusy(null)
    }
  }

  const handleCopyLog = async () => {
    setBusy('log')
    setFeedback(null)

    try {
      const log = await readHeroicLog()

      if (!log.trim()) {
        setFeedback({
          tone: 'error',
          message: t('error.boundary.no-log', 'No Heroic log file was found.')
        })
        return
      }

      await writeToClipboard(log)
      setFeedback({
        tone: 'success',
        message: t(
          'error.boundary.log-copied',
          'Heroic log copied to clipboard.'
        )
      })
    } catch {
      setFeedback({
        tone: 'error',
        message: t(
          'error.boundary.copy-failed',
          'Could not copy. Please try again.'
        )
      })
    } finally {
      setBusy(null)
    }
  }

  const handleOpenLogFolder = () => {
    try {
      window.api?.showLogFileInFolder?.({})
    } catch {
      // Nothing sensible to do if the folder cannot be opened
    }
  }

  const handleOpenIssue = () => {
    try {
      window.api?.openExternalUrl?.(GITHUB_NEW_ISSUE_URL)
    } catch {
      // Ignore
    }
  }

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className="AppError">
      <Panel className="AppError__panel" padding="lg" tone="solid">
        <header className="AppError__header">
          <span className="AppError__icon">
            <Icon glyph={TriangleAlert} size="xl" />
          </span>
          <div className="AppError__heading">
            <p className="AppError__eyebrow">Heroic Games Launcher</p>
            <h1 className="AppError__title">
              {t('error.boundary.title', 'Unexpected application error')}
            </h1>
            <p className="AppError__subtitle">
              {t(
                'error.boundary.subtitle',
                'Heroic ran into a problem it could not recover from. The details below help the developers find and fix it.'
              )}
            </p>
          </div>
        </header>

        <div className="AppError__message" role="alert">
          <span className="AppError__error-name">{errorInfo.name}</span>
          <p className="AppError__error-message">{errorInfo.message}</p>
        </div>

        <dl className="AppError__meta">
          <div>
            <dt>{t('error.boundary.route', 'Route')}</dt>
            <dd>{route || t('error.boundary.unknown', 'Unknown')}</dd>
          </div>
          <div>
            <dt>{t('error.boundary.version', 'Version')}</dt>
            <dd>{heroicVersion || t('error.boundary.unknown', 'Unknown')}</dd>
          </div>
          <div>
            <dt>{t('error.boundary.time', 'Time')}</dt>
            <dd>{occurredAt}</dd>
          </div>
        </dl>

        <details className="AppError__details">
          <summary>
            {t(
              'error.boundary.technical-details',
              'Technical details for developers'
            )}
          </summary>
          <pre className="AppError__stack">{technicalDetails}</pre>
        </details>

        <div className="AppError__actions">
          <Button
            icon={<Icon glyph={Copy} size="sm" />}
            onClick={handleCopyReport}
            disabled={busy !== null}
          >
            {busy === 'report'
              ? t('error.boundary.preparing-report', 'Preparing report…')
              : t('error.boundary.copy-report', 'Copy error report')}
          </Button>
          <Button
            variant="secondary"
            icon={<Icon glyph={FileText} size="sm" />}
            onClick={handleCopyLog}
            disabled={busy !== null}
          >
            {t('error.boundary.copy-log', 'Copy Heroic log')}
          </Button>
          <Button
            variant="ghost"
            icon={<Icon glyph={FolderOpen} size="sm" />}
            onClick={handleOpenLogFolder}
          >
            {t('error.boundary.open-log-folder', 'Open log folder')}
          </Button>
          <Button
            variant="ghost"
            icon={<Icon glyph={RefreshCw} size="sm" />}
            onClick={handleReload}
          >
            {t('error.boundary.reload', 'Reload Heroic')}
          </Button>
          {onGoToLibrary && (
            <Button
              variant="ghost"
              icon={<Icon glyph={RotateCcw} size="sm" />}
              onClick={onGoToLibrary}
            >
              {t('error.boundary.go-to-library', 'Back to library')}
            </Button>
          )}
          <Button
            variant="ghost"
            icon={<Icon glyph={ExternalLink} size="sm" />}
            onClick={handleOpenIssue}
          >
            {t('error.boundary.report-issue', 'Report on GitHub')}
          </Button>
        </div>

        <div className="AppError__feedback" aria-live="polite">
          {feedback && (
            <p
              className={`AppError__feedback-message is-${feedback.tone}`}
              role="status"
            >
              {feedback.message}
            </p>
          )}
        </div>

        <p className="AppError__hint">
          {t(
            'error.boundary.hint',
            'The error report includes the stack trace, your system information and the Heroic log. Attach it when opening an issue.'
          )}
        </p>
      </Panel>
    </div>
  )
}

export default function AppErrorBoundary() {
  const error = useRouteError()
  const location = useLocation()
  const navigate = useNavigate()

  const route = `${location.pathname}${location.search}${location.hash}`

  return (
    <AppErrorScreen
      error={error}
      route={route}
      onGoToLibrary={() => navigate('/')}
    />
  )
}
