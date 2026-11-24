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
import { REQS_NOTES_TITLE, REQS_OTHER_TITLE } from 'common/utils'
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

const FULL_WIDTH_TITLES: string[] = [REQS_OTHER_TITLE, REQS_NOTES_TITLE]

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

  // Other/Notes render as full-width panels
  const specs = reqs.filter(
    (e) => e && e.title && !FULL_WIDTH_TITLES.includes(e.title)
  )
  const sections = [
    {
      row: reqs.find((e) => e?.title === REQS_OTHER_TITLE),
      label: t('specs.other', 'Other')
    },
    {
      row: reqs.find((e) => e?.title === REQS_NOTES_TITLE),
      label: t('specs.notes', 'Notes')
    }
  ]

  const minimum = toItems(specs, 'minimum')
  const recommended = toItems(specs, 'recommended')

  return (
    <div className="gameRequirements">
      {!!minimum.length && (
        <Panel tone="glass" className="gameRequirements__column">
          <h3 className="gameRequirements__title">{t('specs.minimum')}</h3>
          <DetailList items={minimum} />
        </Panel>
      )}
      {!!recommended.length && (
        <Panel tone="glass" className="gameRequirements__column">
          <h3 className="gameRequirements__title">{t('specs.recommended')}</h3>
          <DetailList items={recommended} />
        </Panel>
      )}
      {sections.map(({ row, label }) =>
        row?.minimum ? (
          <Panel
            key={row.title}
            tone="glass"
            className="gameRequirements__column gameRequirements__section"
          >
            <h3 className="gameRequirements__title">{label}</h3>
            <p className="gameRequirements__text">{row.minimum}</p>
          </Panel>
        ) : null
      )}
    </div>
  )
}

export default GameRequirements
