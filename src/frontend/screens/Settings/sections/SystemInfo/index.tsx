import { useTranslation } from 'react-i18next'

import { Skeleton, SpecCard } from 'frontend/components/UI'
import { useAwaited } from 'frontend/hooks/useAwaited'

import SteamDeckLogo from 'frontend/assets/steam-deck-logo.svg?react'

import CPUCard from './cpu'
import MemoryProgress from './memory'
import GPUCard from './gpu'
import OSInfo from './os'
import SoftwareInfo from './software'

import './index.scss'

import type { SystemInformation } from 'backend/utils/systeminfo'

interface SystemSpecificationsProps {
  systemInformation: SystemInformation
}

function SystemSpecifications({
  systemInformation
}: SystemSpecificationsProps) {
  return (
    <>
      <CPUCard cpu={systemInformation.CPU} />
      <MemoryProgress memory={systemInformation.memory} />
      {systemInformation.GPUs.map((gpu, index) => (
        <GPUCard
          key={index}
          gpu={gpu}
          gpuNumber={index}
          showNumber={systemInformation.GPUs.length !== 1}
        />
      ))}
    </>
  )
}

function SteamDeckSystemSpecifications({
  systemInformation
}: SystemSpecificationsProps) {
  const { t } = useTranslation()

  return (
    <>
      <SpecCard
        title={t('settings.systemInformation.systemModel', 'System Model')}
        media={<SteamDeckLogo className="logo fillWithThemeColor" />}
      >
        <span className="SpecCard__value">
          {t('settings.systemInformation.steamDeck', 'Steam Deck {{model}}', {
            model: systemInformation.steamDeckInfo.model
          })}
        </span>
      </SpecCard>
      <SystemSpecifications systemInformation={systemInformation} />
    </>
  )
}

function SpecCardSkeleton() {
  return (
    <div className="SpecCard SpecCard--loading Panel Panel--translucent Panel--padding-md">
      <Skeleton width="30%" height="12px" />
      <Skeleton width="48px" height="48px" radius="12px" />
      <Skeleton width="60%" height="18px" />
      <Skeleton width="38%" height="14px" />
    </div>
  )
}

export default function SystemInfo() {
  const systemInformation = useAwaited(async () =>
    window.api.systemInfo.get(false)
  )

  if (!systemInformation) {
    return (
      <div className="systeminfo">
        <div className="systeminfo__grid">
          {[0, 1, 2, 3].map((i) => (
            <SpecCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="systeminfo">
      <div className="systeminfo__grid">
        <SoftwareInfo software={systemInformation.softwareInUse} />
        {systemInformation.steamDeckInfo.isDeck ? (
          <SteamDeckSystemSpecifications
            systemInformation={systemInformation}
          />
        ) : (
          <SystemSpecifications systemInformation={systemInformation} />
        )}
        <OSInfo
          os={systemInformation.OS}
          isFlatpak={systemInformation.isFlatpak}
        />
      </div>
    </div>
  )
}
