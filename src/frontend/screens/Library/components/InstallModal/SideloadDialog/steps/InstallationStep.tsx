import { FolderOutlined } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

type Props = {
  handleRunExe: () => Promise<void>
  runningSetup: boolean
}

export default function InstallationStep({
  handleRunExe,
  runningSetup
}: Props) {
  const { t } = useTranslation('gamepage')

  return (
    <div className="sideloadInstallForm">
      <div className="installButtons">
        <div
          onClick={async () => !runningSetup && handleRunExe()}
          className="sideloadRunInstaller"
        >
          <FolderOutlined />
          {runningSetup
            ? t('button.running-setup', 'Running Setup')
            : t('button.run-installer', 'Run Installer')}
        </div>
        <button className="button is-tertiary" disabled={runningSetup}>
          {t('button.skip', 'Skip')}
        </button>
      </div>
    </div>
  )
}
