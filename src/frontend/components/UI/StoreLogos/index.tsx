import { Runner } from 'common/types'
import EpicLogo from 'frontend/assets/epic-logo.svg?react'
import GOGLogo from 'frontend/assets/gog-logo.svg?react'
import SideLoad from 'frontend/assets/heroic-icon.svg?react'
import AmazonLogo from 'frontend/assets/amazon-logo.svg?react'
import ZoomLogo from 'frontend/assets/zoom-logo.svg?react'

type Props = { runner?: Runner; runners?: Runner[]; className?: string }

export default function StoreLogos({
  runner,
  runners,
  className = 'store-icon'
}: Props) {
  const runnersToShow = runners || (runner ? [runner] : [])

  return (
    <div className="store-logos-container">
      {runnersToShow.map((r, index) => {
        switch (r) {
          case 'legendary':
            return <EpicLogo key={index} className={className} />
          case 'gog':
            return <GOGLogo key={index} className={className} />
          case 'nile':
            return <AmazonLogo key={index} className={className} />
          case 'zoom':
            return <ZoomLogo key={index} className={className} />
          default:
            return <SideLoad key={index} className={className} />
        }
      })}
    </div>
  )
}
