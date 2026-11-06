import React from 'react'

import { ProgressBar, SpecCard } from 'frontend/components/UI'

import type { SystemInformation } from 'backend/utils/systeminfo'
import { useTranslation } from 'react-i18next'

interface Props {
  memory: SystemInformation['memory']
}

function MemoryProgress({ memory }: Props) {
  const { total, used, totalFormatted, usedFormatted } = memory
  const { t } = useTranslation()

  const memoryUsedInPercent = (used / total) * 100

  return (
    <SpecCard title={t('settings.systemInformation.memory', 'Memory')}>
      <span className="SpecCard__value">
        {t(
          'settings.systemInformation.memoryUsage',
          '{{usedGib}} of {{totalGib}}',
          { usedGib: usedFormatted, totalGib: totalFormatted }
        )}
      </span>
      <ProgressBar value={memoryUsedInPercent} tone="success" />
      <span className="SpecCard__meta">
        {t(
          'settings.systemInformation.memoryPercent',
          '{{percentUsed}}% used',
          {
            percentUsed: Math.round(memoryUsedInPercent)
          }
        )}
      </span>
    </SpecCard>
  )
}

export default React.memo(MemoryProgress)
