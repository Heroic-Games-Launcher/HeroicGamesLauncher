import { ThirdPartyLaunchers, GameStatus } from 'common/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import './index.scss'

interface Props {
  id: ThirdPartyLaunchers
  name: string
  icon: () => JSX.Element
  onInstall: (id: ThirdPartyLaunchers) => void
  onUninstall?: (id: ThirdPartyLaunchers) => void
  onCancel?: (id: ThirdPartyLaunchers) => void
  buttonText: string
  disabled?: boolean
  status?: GameStatus
  isInstalled?: boolean
}

export default function ThirdPartyLauncherInstaller({
  id,
  icon,
  onInstall,
  onUninstall,
  onCancel,
  buttonText,
  disabled,
  status,
  isInstalled
}: Props) {
  const isInstalling = status?.status === 'installing'
  const percentage = status?.progress?.percent ?? 0

  return (
    <div className={`runnerWrapper ${id} ${disabled ? 'disabled' : ''}`}>
      <div className={`runnerIcon ${id}`}>{icon()}</div>
      <div className="runnerButtons">
        {isInstalling ? (
          <div
            className="runnerLogin installing"
            onClick={() => !disabled && onCancel?.(id)}
            style={{
              position: 'relative',
              overflow: 'hidden',
              display: 'flex'
            }}
          >
            <div
              className="progress-bar"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: `${percentage}%`,
                background: 'rgba(255, 255, 255, 0.2)',
                transition: 'width 0.2s',
                pointerEvents: 'none'
              }}
            />
            <span
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                fontSize: '1rem'
              }}
            >
              {status?.context || 'Installing...'}{' '}
              {percentage > 0 && `${Math.round(percentage)}%`}
              <FontAwesomeIcon
                icon={faTimes}
                title="Cancel"
                className="cancel-icon"
              />
            </span>
          </div>
        ) : (
          <div
            className="runnerLogin"
            onClick={() => {
              if (disabled) {
                return
              }

              if (isInstalled) {
                onUninstall?.(id)
                return
              }

              onInstall(id)
            }}
          >
            {buttonText}
          </div>
        )}
      </div>
    </div>
  )
}
