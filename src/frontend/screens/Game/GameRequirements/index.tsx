import React, { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { ExtraInfo } from 'common/types'

import './index.css'

type Props = {
  extraInfo: ExtraInfo
}

function GameRequirements({ extraInfo }: Props) {
  const { t } = useTranslation('gamepage')

  const haveSystemRequirements = Boolean(extraInfo?.reqs?.length)

  return (
    <div
      className="gameRequirements"
      style={{ marginBottom: haveSystemRequirements ? 0 : '2em' }}
    >
      {haveSystemRequirements && (
        <>
          <table>
            <tbody>
              <tr>
                <td className="specs"></td>
                <td className="specs">{t('specs.minimum').toUpperCase()}</td>
                <td className="specs">
                  {t('specs.recommended').toUpperCase()}
                </td>
              </tr>
              {extraInfo.reqs.map(
                (e) =>
                  e &&
                  e.title && (
                    <Fragment key={e.title}>
                      <tr>
                        <td>
                          <span className="title">
                            {e.title.toUpperCase()}:
                          </span>
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
        </>
      )}
    </div>
  )
}

export default GameRequirements
