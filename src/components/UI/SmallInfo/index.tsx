import React from 'react'

import './index.css'

type Props = {
  handleclick?: () => void
  subtitle: string
  title: string
}

export default function SmallInfo({handleclick, subtitle, title}: Props) {
  const handleOnClick = () => {
    return handleclick ? handleclick() : null
  }
  return (
    <div className="smallInfo" onClick={handleOnClick} style={{cursor: handleclick ? 'pointer' :  'unset'}}>
      <span className="smallTitle">{title}</span> <br />
      <span className="smallsubtitle">{subtitle}</span>
    </div>
  )
}
