import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { useAwaited } from 'frontend/hooks/useAwaited'
import type { GameHandle } from 'frontend/helpers/ipc'

import './index.css'

type Props = {
  game: GameHandle
}

function GameRequirements({ game }: Props) {
  const { t } = useTranslation('gamepage')
  const reqs = useAwaited(window.api.game.getRequirements, game)

  if (!reqs || !reqs.length)
    return t('game.noRequirementsFound', 'No requirements found')

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
