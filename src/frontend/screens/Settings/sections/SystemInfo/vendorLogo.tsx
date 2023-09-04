import React from 'react'

import { ReactComponent as AMDLogo } from 'frontend/assets/amd-logo.svg'
import { ReactComponent as NVIDIALogo } from 'frontend/assets/nvidia-logo.svg'
import { ReactComponent as IntelLogo } from 'frontend/assets/intel-logo.svg'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faApple } from '@fortawesome/free-brands-svg-icons'

interface Props {
  model?: string
}

function VendorLogo({ model }: Props) {
  if (!model) return <></>

  model = model.toLowerCase()

  if (model.includes('nvidia'))
    return <NVIDIALogo className="logo fillWithThemeColor" />
  if (model.includes('amd') || model.includes('advanced micro devices'))
    return <AMDLogo className="logo fillWithThemeColor" />
  if (model.includes('intel'))
    return <IntelLogo className="logo fillWithThemeColor" />
  if (model.includes('apple'))
    return <FontAwesomeIcon icon={faApple} className="logo" />
  return <></>
}

export default React.memo(VendorLogo)
