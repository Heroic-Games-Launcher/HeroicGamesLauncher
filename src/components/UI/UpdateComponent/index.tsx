import './index.css'

import React from 'react'
import Update from '@material-ui/icons/Update'

export default function UpdateComponent() {
  return (
    <div className="updateIcon" data-testid="updateComponent">
      <Update className="material-icons" style={{zIndex: 999}} />
    </div>
  )
}
