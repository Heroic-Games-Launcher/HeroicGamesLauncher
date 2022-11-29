import React from 'react'
import { SvgButton } from '../../../../components/UI'
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle'
import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import { ReactComponent as StopIconAlt } from '../../../../assets/stop-icon-alt.svg'
import { ReactComponent as StopIcon } from '../../../../assets/stop-icon.svg'
import { ReactComponent as PlayIcon } from '../../../../assets/play-icon.svg'
import { Game } from '../../../../state/new/model/Game'
import { useTranslation } from 'react-i18next'
import useGlobalStore from '../../../../hooks/useGlobalStore'
import { observer } from 'mobx-react'

const ActionButton: React.FC<{ game: Game; title: string }> = ({
  game,
  title
}) => {
  const { t } = useTranslation('gamepage')
  const { gameDownloadQueue } = useGlobalStore()

  if (game.isUninstalling) {
    return (
      <button className="svg-button iconDisabled">
        <svg />
      </button>
    )
  }

  if (game.isQueued) {
    return (
      <SvgButton
        title={t('button.queue.remove', 'Remove from Queue')}
        className="queueIcon"
        onClick={() => gameDownloadQueue.removeGame(game)}
      >
        <RemoveCircleIcon />
      </SvgButton>
    )
  }

  if (game.isPlaying) {
    return (
      <SvgButton
        className="cancelIcon"
        onClick={() => game.stop()}
        title={`${t('label.playing.stop')} (${title})`}
      >
        <StopIconAlt />
      </SvgButton>
    )
  }

  if (game.isInstalling || game.isQueued) {
    return (
      <SvgButton
        className="cancelIcon"
        onClick={async () => gameDownloadQueue.removeGame(game)}
        title={`${t('button.cancel')} (${title})`}
      >
        <StopIcon />
      </SvgButton>
    )
  }

  if (game.isInstalled) {
    return (
      <SvgButton
        className="playIcon"
        onClick={async () => game.play()}
        title={`${t('label.playing.start')} (${title})`}
      >
        <PlayIcon />
      </SvgButton>
    )
  }
  return (
    <div onClick={async () => gameDownloadQueue.addGame(game)}>
      <DownloadOutlined />
    </div>
  )
}

export default observer(ActionButton)
