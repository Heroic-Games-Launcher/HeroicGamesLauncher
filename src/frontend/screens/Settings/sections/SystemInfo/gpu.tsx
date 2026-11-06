import React from 'react'
import { useTranslation } from 'react-i18next'

import { SpecCard } from 'frontend/components/UI'
import VendorLogo from './vendorLogo'

import type { SystemInformation } from 'backend/utils/systeminfo'

interface GPUCardProps {
  gpu: SystemInformation['GPUs'][number]
  gpuNumber: number
  showNumber: boolean
}

function GPUCard({ gpu, gpuNumber, showNumber }: GPUCardProps) {
  const {
    vendorString,
    deviceString,
    deviceId,
    vendorId,
    subdeviceId,
    subvendorId,
    driverVersion
  } = gpu
  const { t } = useTranslation()

  const headingText = showNumber
    ? t('settings.systemInformation.gpuWithNumber', 'GPU {{number}}', {
        number: gpuNumber + 1
      })
    : t('settings.systemInformation.gpu', 'GPU')

  return (
    <SpecCard title={headingText} media={<VendorLogo model={vendorString} />}>
      <span className="SpecCard__value">{deviceString}</span>
      <span className="SpecCard__meta">
        {t(
          'settings.systemInformation.gpuDriver',
          'Driver: {{driverVersion}}',
          { driverVersion }
        )}
      </span>
      <span className="SpecCard__meta">
        DID={deviceId} VID={vendorId}, DSID={subdeviceId} VSID={subvendorId}
      </span>
    </SpecCard>
  )
}

export default React.memo(GPUCard)
