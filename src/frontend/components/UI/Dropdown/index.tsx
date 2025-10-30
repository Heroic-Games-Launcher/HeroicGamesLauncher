import { ReactNode, useState } from 'react'
import './index.scss'

type Props = {
  title: ReactNode | string
  children: ReactNode
  className?: string
}

export default function Dropdown({ title, children, className }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={'dropdownContainer'}>
      <button className={`selectStyle`} onClick={() => setExpanded(!expanded)}>
        {title}
      </button>
      <div className={`dropdown ${expanded ? 'expanded' : 'collapsed'}`}>
        {children}
      </div>
    </div>
  )
}
