import React from 'react'
import { Runner } from 'common/types'
import { ReactComponent as EpicLogo } from 'frontend/assets/epic-logo.svg'
import { ReactComponent as GOGLogo } from 'frontend/assets/gog-logo.svg'
import { ReactComponent as SideLoad } from 'frontend/assets/heroic-icon.svg'
import { ReactComponent as AmazonLogo } from 'frontend/assets/amazon-logo.svg'

type Props = { runner: Runner; className?: string }

export default function StoreLogos({
  runner,
  className = 'store-icon'
}: Props) {
  switch (runner) {
    case 'legendary':
      return <EpicLogo className={className} />
    case 'gog':
      return <GOGLogo className={className} />
    case 'nile':
      return <AmazonLogo className={className} />
    default:
      return <SideLoad className={className} />
  }
}
