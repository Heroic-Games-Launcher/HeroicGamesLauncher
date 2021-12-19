import './index.css'

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'

export default function UpdateComponent() {
  return (
    <div className="updateIcon" data-testid="updateComponent">
      <FontAwesomeIcon className="icon" icon={faSyncAlt} />
    </div>
  )
}
