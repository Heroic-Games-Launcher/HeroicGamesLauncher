import { useTranslation } from 'react-i18next'
import {
  Cpu,
  HardDrive,
  MemoryStick,
  MonitorPlay,
  Network,
  Volume2
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Reqs } from 'common/types'
import { DetailList, Panel } from 'frontend/components/UI'
import type { DetailItem } from 'frontend/components/UI/DetailList'

import './index.css'

type Props = {
  reqs?: Reqs[]
}

const GLYPHS: { match: RegExp; glyph: LucideIcon }[] = [
  { match: /processor|cpu/i, glyph: Cpu },
  { match: /memory|ram/i, glyph: MemoryStick },
  { match: /storage|disk|space/i, glyph: HardDrive },
  { match: /sound|audio/i, glyph: Volume2 },
  { match: /network|internet/i, glyph: Network }
]

function glyphFor(title: string) {
  return GLYPHS.find(({ match }) => match.test(title))?.glyph ?? MonitorPlay
}

function toItems(reqs: Reqs[], key: 'minimum' | 'recommended'): DetailItem[] {
  return reqs
    .filter((req) => req?.title && req[key])
    .map((req) => ({
      glyph: glyphFor(req.title),
      label: req.title,
      value: req[key]
    }))
}

function GameRequirements({ reqs }: Props) {
  const { t } = useTranslation('gamepage')

  if (!reqs || !reqs.length) return null

  const minimum = toItems(reqs, 'minimum')
  const recommended = toItems(reqs, 'recommended')

  return (
    <div className="gameRequirements">
      {!!minimum.length && (
        <Panel className="gameRequirements__column">
          <h3 className="gameRequirements__title">{t('specs.minimum')}</h3>
          <DetailList items={minimum} />
        </Panel>
      )}
      {!!recommended.length && (
        <Panel className="gameRequirements__column">
          <h3 className="gameRequirements__title">{t('specs.recommended')}</h3>
          <DetailList items={recommended} />
        </Panel>
      )}
    </div>
  )
}

export default GameRequirements
