import { GogInstallInfo } from 'common/types/gog'
import { LegendaryInstallInfo } from 'common/types/legendary'
import { NileInstallInfo } from 'common/types/nile'
import React from 'react'

interface GOGModifyInstallModal {
  gameInstallInfo:
    | LegendaryInstallInfo
    | GogInstallInfo
    | NileInstallInfo
    | null
  onClose: () => void
}

export default function GOGModifyInstallModal({
  gameInstallInfo
}: GOGModifyInstallModal) {
  return <div>GOG</div>
}
