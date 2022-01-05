import './index.css'

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'

type Props = {
  message?: string
}

export default function UpdateComponent({ message = 'Loading' }: Props) {
  return (
    <div className="updateIcon" data-testid="updateComponent">
      <FontAwesomeIcon className="icon" icon={faSyncAlt} />
      <span>{message}</span>
    </div>
  )
}
