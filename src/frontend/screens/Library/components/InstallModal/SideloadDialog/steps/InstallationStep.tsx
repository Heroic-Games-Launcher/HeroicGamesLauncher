import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  MonitorDown,
  SkipForward
} from 'lucide-react'
import Button from 'frontend/components/UI/Button'
import { Icon, LogPanel } from 'frontend/components/UI'
import HorizontalSelector from 'frontend/components/UI/HorizontalSelector'

type Props = {
  appName: string
  title: string
  handleRunExe: () => void
  onSkip: () => void
  onFinish: () => void
  runningSetup: boolean
}

export default function InstallationStep({
  appName,
  title,
  handleRunExe,
  onSkip,
  onFinish,
  runningSetup
}: Props) {
  const { t } = useTranslation('gamepage')
  const [showLogs, setShowLogs] = useState(false)
  const [logContent, setLogContent] = useState('')
  const fetching = useRef(false)

  useEffect(() => {
    if (!runningSetup) return

    const fetchLog = () => {
      if (fetching.current) return
      fetching.current = true
      window.api
        .getLogContent({ appName, runner: 'sideload', type: 'install' })
        .then((content) => setLogContent(content || ''))
        .catch(() => {})
        .finally(() => {
          fetching.current = false
        })
    }

    fetchLog()
    const interval = setInterval(fetchLog, 1000)
    return () => clearInterval(interval)
  }, [runningSetup, appName])

  if (runningSetup) {
    return (
      <div className="sideloadInstallation sideloadInstallation--running">
        <div className="sideloadInstallation__status">
          <Icon glyph={LoaderCircle} size="lg" className="spinner" />
          <span>
            {title
              ? t('sideload.install.installing', 'Installing {{title}}…', {
                  title
                })
              : t('button.running-setup', 'Running installer...')}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          icon={<Icon glyph={showLogs ? ChevronUp : ChevronDown} size="sm" />}
          onClick={() => setShowLogs(!showLogs)}
        >
          {showLogs
            ? t('button.hide-logs', 'Hide logs')
            : t('button.show-logs', 'Show logs')}
        </Button>

        {showLogs && (
          <div className="sideloadInstallation__log">
            {logContent ? (
              <LogPanel content={logContent} />
            ) : (
              <span className="sideloadInstallation__logPlaceholder">
                {t(
                  'sideload.install.waiting-log',
                  'Waiting for installer output…'
                )}
              </span>
            )}
          </div>
        )}

        <div className="sideloadInstallation__actions">
          <Button
            variant="secondary"
            icon={<Icon glyph={SkipForward} size="md" />}
            onClick={onSkip}
          >
            {t('button.skip-waiting', 'Skip waiting')}
          </Button>
          <Button variant="primary" onClick={onFinish}>
            {t('button.finish', 'Finish')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="sideloadInstallation">
      <HorizontalSelector
        options={[
          {
            icon: <Icon glyph={MonitorDown} size="xl" />,
            title: t('button.run-installer.title', 'Run installer'),
            subtitle: t(
              'button.run-installer.subtitle',
              'The game comes with an installer I need to run before I can play it'
            ),
            onClick: handleRunExe
          },
          {
            icon: <Icon glyph={SkipForward} size="xl" />,
            title: t('button.skip-installer.title', 'Skip'),
            subtitle: t(
              'button.skip-installer.subtitle',
              'I already have a game executable I can run to play the game'
            ),
            onClick: onSkip
          }
        ]}
      />
    </div>
  )
}
