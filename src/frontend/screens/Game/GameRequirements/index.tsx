import { CSSProperties } from 'react'
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
import { DetailList } from 'frontend/components/UI'
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

const MISSING_VALUE = '—'

function toItems(reqs: Reqs[], key: 'minimum' | 'recommended'): DetailItem[] {
  return reqs.map((req) => ({
    glyph: glyphFor(req.title),
    label: req.title,
    value: req[key] || MISSING_VALUE
  }))
}

function rowSpan(rows: number): CSSProperties {
  return { '--requirements-rows': rows + 1 } as CSSProperties
}

function GameRequirements({ reqs }: Props) {
  const { t } = useTranslation('gamepage')

  if (!reqs || !reqs.length) return null

  // Other/Notes render as full-width panels
  const specs = reqs.filter(
    (e) =>
      e &&
      e.title &&
      !FULL_WIDTH_TITLES.includes(e.title) &&
      (e.minimum || e.recommended)
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

  const hasMinimum = specs.some((req) => req.minimum)
  const hasRecommended = specs.some((req) => req.recommended)

  return (
    <div className="gameRequirements">
      {hasMinimum && (
        <section
          className="gameRequirements__column gameRequirements__specs"
          style={rowSpan(specs.length)}
        >
          <h3 className="gameRequirements__title">{t('specs.minimum')}</h3>
          <DetailList
            items={toItems(specs, 'minimum')}
            className="gameRequirements__list"
          />
        </section>
      )}
      {hasRecommended && (
        <section
          className="gameRequirements__column gameRequirements__specs"
          style={rowSpan(specs.length)}
        >
          <h3 className="gameRequirements__title">{t('specs.recommended')}</h3>
          <DetailList
            items={toItems(specs, 'recommended')}
            className="gameRequirements__list"
          />
        </section>
      )}
      {sections.map(({ row, label }) =>
        row?.minimum ? (
          <section
            key={row.title}
            className="gameRequirements__column gameRequirements__section"
          >
            <h3 className="gameRequirements__title">{label}</h3>
            <p className="gameRequirements__text">{row.minimum}</p>
          </section>
        ) : null
      )}
    </div>
  )
}

export default GameRequirements
