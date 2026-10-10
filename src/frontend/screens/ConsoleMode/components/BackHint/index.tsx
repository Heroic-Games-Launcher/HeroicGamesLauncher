import { Fragment } from 'react'
import classNames from 'classnames'
import { useGamepadInfo } from '../../hooks'
import { getBackButtonLabel } from '../../controller'

export default function BackHint({
  prefix,
  suffix,
  active,
  buttons
}: {
  prefix: string
  suffix: string
  active?: boolean
  buttons?: string[]
}) {
  const { connected: gamepadConnected, layout: controllerLayout } =
    useGamepadInfo()
  const backButtonLabel = getBackButtonLabel(controllerLayout)
  const labels = gamepadConnected ? (buttons ?? [backButtonLabel]) : ['Esc']

  return (
    <div className={classNames('consoleLaunchHint', { active })}>
      {prefix}{' '}
      {labels.map((label, i) => (
        <Fragment key={label}>
          {i > 0 && ' + '}
          <kbd>{label}</kbd>
        </Fragment>
      ))}{' '}
      {suffix}
    </div>
  )
}
