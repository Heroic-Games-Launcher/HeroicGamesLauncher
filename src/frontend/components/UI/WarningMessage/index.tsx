import './index.css'
import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'

interface Props {
  children: React.ReactNode
  className?: string
}

export default function WarningMessage({ children, className }: Props) {
  return (
    <div className={['WarningMessage', className].filter(Boolean).join(' ')}>
      <FontAwesomeIcon icon={faExclamationTriangle} color="yellow" />
      <div>{children}</div>
    </div>
  )
}
