import { useTranslation } from 'react-i18next'
import { LoaderCircle, MonitorDown, SkipForward } from 'lucide-react'
import Button from 'frontend/components/UI/Button'
import { Icon } from 'frontend/components/UI'
import HorizontalSelector from 'frontend/components/UI/HorizontalSelector'

type Props = {
  handleRunExe: () => void
  onSkip: () => void
  runningSetup: boolean
}

export default function InstallationStep({
  handleRunExe,
  onSkip,
  runningSetup
}: Props) {
  const { t } = useTranslation('gamepage')

  if (runningSetup) {
    return (
      <div className="sideloadInstallation sideloadInstallation--running">
        <Icon glyph={LoaderCircle} size="xl" className="spinner" />
        <span className="sideloadInstallation__status">
          {t('button.running-setup', 'Running installer...')}
        </span>
        <Button
          variant="secondary"
          icon={<Icon glyph={SkipForward} size="md" />}
          onClick={onSkip}
        >
          {t('button.skip-waiting', 'Skip waiting')}
        </Button>
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
