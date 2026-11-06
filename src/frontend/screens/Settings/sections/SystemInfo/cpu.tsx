import React from 'react'

import { SpecCard } from 'frontend/components/UI'

import type { SystemInformation } from 'backend/utils/systeminfo'
import { useTranslation } from 'react-i18next'
import VendorLogo from './vendorLogo'

function CPUCard({ cpu }: { cpu: SystemInformation['CPU'] }) {
  const { model, cores } = cpu
  const { t } = useTranslation()

  return (
    <SpecCard
      title={t('settings.systemInformation.cpu', 'CPU')}
      media={<VendorLogo model={model} />}
    >
      <span className="SpecCard__value">{model}</span>
      <span className="SpecCard__meta">
        {t('settings.systemInformation.cpuCores', '{{numOfCores}} cores', {
          numOfCores: cores
        })}
      </span>
    </SpecCard>
  )
}

export default React.memo(CPUCard)
