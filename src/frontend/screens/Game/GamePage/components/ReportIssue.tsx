import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GameInfo } from 'common/types'
import { Button, Icon } from 'frontend/components/UI'
import useGlobalState from 'frontend/state/GlobalStateV2'

interface Props {
  gameInfo: GameInfo
}

const ReportIssue = ({ gameInfo }: Props) => {
  const { t } = useTranslation('gamepage')
  const { openGameLogsModal } = useGlobalState.keys('openGameLogsModal')

  if (!gameInfo.is_installed || gameInfo.install.platform === 'Browser') {
    return null
  }

  return (
    <Button
      variant="warning"
      className="reportProblem"
      onClick={() => openGameLogsModal(gameInfo)}
      icon={<Icon glyph={TriangleAlert} size="md" />}
    >
      {t('report_problem', 'Report a problem running this game')}
    </Button>
  )
}

export default ReportIssue
