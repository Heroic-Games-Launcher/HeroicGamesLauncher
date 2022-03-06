import React, { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { GameInfo } from 'src/types'

import './index.css'

type Props = {
  gameInfo: GameInfo
}

function GameRequirements({ gameInfo }: Props) {
  const { t } = useTranslation('gamepage')

  const { is_game, extra }: GameInfo = gameInfo
  const haveSystemRequirements = Boolean(extra?.reqs?.length)

  return (
    <div
      className="gameRequirements"
      style={{ marginBottom: haveSystemRequirements ? 0 : '2em' }}
    >
      {haveSystemRequirements && is_game && (
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
              {extra.reqs.map(
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
