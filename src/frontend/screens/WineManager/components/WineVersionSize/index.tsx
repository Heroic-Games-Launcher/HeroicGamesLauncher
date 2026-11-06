import { WineVersionInfo } from 'common/types'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'

import { ProgressBar } from 'frontend/components/UI'
import { size } from 'frontend/helpers'
import useWineManagerState from '../../state'
import './index.css'

export default function WineVersionSize({
  version,
  downsize,
  disksize,
  isInstalled
}: WineVersionInfo) {
  const { t } = useTranslation()
  const state = useWineManagerState(useShallow((state) => state[version]))

  const isDownloading = state?.status === 'downloading'
  const isUnzipping = state?.status === 'unzipping'
  const percentage = state && 'percentage' in state ? state.percentage : 0

  if (isDownloading || isUnzipping) {
    return (
      <div className="WineVersionSize WineVersionSize--busy">
        <span className="WineVersionSize__label">
          {isUnzipping
            ? t('wine.manager.unzipping', 'Unzipping')
            : `${percentage.toFixed(1)}%`}
        </span>
        <ProgressBar
          value={isUnzipping ? undefined : percentage}
          label={version}
        />
      </div>
    )
  }

  return (
    <span className="WineVersionSize__value">
      {size(isInstalled ? disksize : downsize)}
    </span>
  )
}
