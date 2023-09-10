import React, { useContext } from 'react'
import GameContext from '../../GameContext'
import { GameInfo } from 'common/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import ContextProvider from 'frontend/state/ContextProvider'
import { useTranslation } from 'react-i18next'

interface Props {
  gameInfo: GameInfo
}

const ReportIssue = ({ gameInfo }: Props) => {
  const { t } = useTranslation('gamepage')
  const { setIsSettingsModalOpen } = useContext(ContextProvider)
  const { runner } = useContext(GameContext)

  const showReportIssue =
    gameInfo.is_installed && gameInfo.install.platform !== 'Browser'

  if (runner === 'sideload') {
    return null
  }

  if (!showReportIssue) {
    return null
  }

  return (
    <span
      onClick={() => setIsSettingsModalOpen(true, 'log', gameInfo)}
      className="clickable reportProblem"
      role={'button'}
    >
      <>
        {<FontAwesomeIcon icon={faTriangleExclamation} />}
        {t('report_problem', 'Report a problem running this game')}
      </>
    </span>
  )
}

export default ReportIssue
