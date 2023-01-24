import React, { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { Reqs } from 'common/types'

import './index.css'

type Props = {
  reqs?: Reqs[]
}

function GameRequirements({ reqs }: Props) {
  const { t } = useTranslation('gamepage')

  if (!reqs || !reqs.length) return null

  return (
    <div className="gameRequirements" style={{ marginBottom: '2em' }}>
      <table>
        <tbody>
          <tr>
            <td className="specs"></td>
            <td className="specs">{t('specs.minimum').toUpperCase()}</td>
            <td className="specs">{t('specs.recommended').toUpperCase()}</td>
          </tr>
          {reqs.map(
            (e) =>
              e &&
              e.title && (
                <Fragment key={e.title}>
                  <tr>
                    <td>
                      <span className="title">{e.title.toUpperCase()}:</span>
                    </td>
                    <td>
                      <span className="text">{e.minimum}</span>
                    </td>
                    <td>
                      <span className="text">{e.recommended}</span>
                    </td>
                  </tr>
                </Fragment>
              )
          )}
        </tbody>
      </table>
    </div>
  )
}

export default GameRequirements
