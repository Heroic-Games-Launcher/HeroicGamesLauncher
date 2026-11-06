import React from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faApple, faLinux, faWindows } from '@fortawesome/free-brands-svg-icons'

import { SpecCard } from 'frontend/components/UI'

import type { SystemInformation } from 'backend/utils/systeminfo'
import { useTranslation } from 'react-i18next'

interface OSLogoProps {
  platform: string
}

function OSLogo({ platform }: OSLogoProps) {
  if (platform === 'win32')
    return <FontAwesomeIcon icon={faWindows} className="logo" />
  if (platform === 'darwin')
    return <FontAwesomeIcon icon={faApple} className="logo" />
  if (platform === 'linux')
    return <FontAwesomeIcon icon={faLinux} className="logo" />
  return <></>
}

interface OSInfoProps {
  os: SystemInformation['OS']
  isFlatpak: boolean
}

function OSInfo({ os, isFlatpak }: OSInfoProps) {
  const { t } = useTranslation()

  return (
    <SpecCard
      title={t('settings.systemInformation.os', 'Operating System')}
      media={<OSLogo platform={os.platform} />}
    >
      <span className="SpecCard__value">
        {isFlatpak
          ? t(
              'settings.systemInformation.osNameFlatpak',
              '{{osName}} (inside Flatpak)',
              { osName: os.name }
            )
          : os.name}
      </span>
      <span className="SpecCard__meta">
        {t(
          'settings.systemInformation.osVersion',
          'Version {{versionNumber}}',
          { versionNumber: os.version }
        )}
      </span>
    </SpecCard>
  )
}

export default React.memo(OSInfo)
