import React from 'react'

import { SpecCard } from 'frontend/components/UI'
import HeroicIcon from 'frontend/assets/heroic-icon.svg?react'

import type { SystemInformation } from 'backend/utils/systeminfo'
import { useTranslation } from 'react-i18next'

interface Props {
  software: SystemInformation['softwareInUse']
}

function SoftwareInfo({ software }: Props) {
  const { t } = useTranslation()

  const {
    heroicVersion,
    legendaryVersion,
    gogdlVersion,
    cometVersion,
    nileVersion
  } = software

  const rows = [
    { key: 'Heroic', value: heroicVersion },
    { key: 'Legendary', value: legendaryVersion },
    { key: 'Gogdl', value: gogdlVersion },
    { key: 'Comet', value: cometVersion },
    { key: 'Nile', value: nileVersion }
  ]

  return (
    <SpecCard
      title={t('settings.systemInformation.software', 'Software')}
      media={<HeroicIcon className="heroic-icon" />}
    >
      <ul className="SpecCard__list">
        {rows.map(({ key, value }) => (
          <li key={key} className="SpecCard__listRow">
            <span className="SpecCard__listKey">{key}</span>
            <span className="SpecCard__listValue">{value}</span>
          </li>
        ))}
      </ul>
    </SpecCard>
  )
}

export default React.memo(SoftwareInfo)
