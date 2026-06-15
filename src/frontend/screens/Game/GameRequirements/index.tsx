import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Reqs, REQS_NOTES_TITLE, REQS_OTHER_TITLE } from 'common/types'

import './index.css'

type Props = {
  reqs?: Reqs[]
}

const FULL_WIDTH_TITLES: string[] = [REQS_OTHER_TITLE, REQS_NOTES_TITLE]

function GameRequirements({ reqs }: Props) {
  const { t } = useTranslation('gamepage')

  if (!reqs || !reqs.length) return null

  // Regular labeled specs go into the Minimum/Recommended table
  const specs = reqs.filter(
    (e) => e && e.title && !FULL_WIDTH_TITLES.includes(e.title)
  )
  const other = reqs.find((e) => e?.title === REQS_OTHER_TITLE)
  const notes = reqs.find((e) => e?.title === REQS_NOTES_TITLE)

  //  collapse to a single value column.
  const hasRecommended = specs.some((e) => e.recommended)

  const sectionLabel = (title: string) =>
    title === REQS_NOTES_TITLE
      ? t('specs.notes', 'Notes')
      : t('specs.other', 'Other')

  return (
    <div className="gameRequirements" style={{ marginBottom: '2em' }}>
      {specs.length > 0 && (
        <table>
          <tbody>
            <tr>
              <td className="specs"></td>
              <td className="specs">{t('specs.minimum').toUpperCase()}</td>
              {hasRecommended && (
                <td className="specs">
                  {t('specs.recommended').toUpperCase()}
                </td>
              )}
            </tr>
            {specs.map((e) => (
              <Fragment key={e.title}>
                <tr>
                  <td>
                    <span className="title">{e.title.toUpperCase()}:</span>
                  </td>
                  <td>
                    <span className="text">{e.minimum}</span>
                  </td>
                  {hasRecommended && (
                    <td>
                      <span className="text">{e.recommended}</span>
                    </td>
                  )}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
      {[other, notes].map((row) =>
        row && row.minimum ? (
          <div className="reqsSection" key={row.title}>
            <span className="title">
              {sectionLabel(row.title).toUpperCase()}:
            </span>
            <span className="text">{row.minimum}</span>
          </div>
        ) : null
      )}
    </div>
  )
}

export default GameRequirements
