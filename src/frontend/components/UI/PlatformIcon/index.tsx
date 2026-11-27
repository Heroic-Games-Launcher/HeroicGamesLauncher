import classNames from 'classnames'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faApple, faLinux, faWindows } from '@fortawesome/free-brands-svg-icons'
import { IconDefinition, faGlobe } from '@fortawesome/free-solid-svg-icons'
import './index.css'

type PlatformKey = 'windows' | 'mac' | 'linux' | 'browser'

const ALIASES: Record<string, PlatformKey> = {
  windows: 'windows',
  win32: 'windows',
  mac: 'mac',
  osx: 'mac',
  macos: 'mac',
  linux: 'linux',
  browser: 'browser'
}

const PLATFORMS: Record<PlatformKey, { label: string; icon: IconDefinition }> =
  {
    windows: { label: 'Windows', icon: faWindows },
    mac: { label: 'macOS', icon: faApple },
    linux: { label: 'Linux', icon: faLinux },
    browser: { label: 'Browser', icon: faGlobe }
  }

interface PlatformIconProps {
  platform: string
  className?: string
}

export default function PlatformIcon({
  platform,
  className
}: PlatformIconProps) {
  const key = ALIASES[platform.toLowerCase()]
  if (!key) return null

  const { label, icon } = PLATFORMS[key]

  return (
    <span
      className={classNames('PlatformIcon', className)}
      role="img"
      aria-label={label}
      title={label}
    >
      <FontAwesomeIcon icon={icon} />
    </span>
  )
}
