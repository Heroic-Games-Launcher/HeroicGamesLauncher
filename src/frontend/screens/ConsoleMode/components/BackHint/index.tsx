import classNames from 'classnames'

export default function BackHint({
  prefix,
  suffix,
  gamepadConnected,
  backButtonLabel,
  active
}: {
  prefix: string
  suffix: string
  gamepadConnected: boolean
  backButtonLabel: string
  active?: boolean
}) {
  return (
    <div className={classNames('consoleLaunchHint', { active })}>
      {prefix} <kbd>{gamepadConnected ? backButtonLabel : 'Esc'}</kbd> {suffix}
    </div>
  )
}
