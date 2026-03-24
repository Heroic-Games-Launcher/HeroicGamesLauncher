import { ThirdPartyLaunchers } from 'common/types'
import './index.scss'

interface Props {
  id: ThirdPartyLaunchers
  name: string
  icon: () => JSX.Element
  onInstall: (id: string) => void
  buttonText: string
  disabled?: boolean
}

export default function ThirdPartyLauncherInstaller({
  id,
  icon,
  onInstall,
  buttonText,
  disabled
}: Props) {
  return (
    <div className={`runnerWrapper ${id} ${disabled ? 'disabled' : ''}`}>
      <div className={`runnerIcon ${id}`}>{icon()}</div>
      <div className="runnerButtons">
        <div className="runnerLogin" onClick={() => !disabled && onInstall(id)}>
          {buttonText}
        </div>
      </div>
    </div>
  )
}
