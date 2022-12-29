import React from 'react'

type Props = {
  isOpen: boolean
  summary: string
  children: React.ReactNode
  isColapsible?: boolean
}

const Collapsible = ({ isOpen, isColapsible, children, summary }: Props) => {
  return isColapsible ? (
    <details open={isOpen}>
      <summary className="settingSubheader">{summary}</summary>
      {children}
    </details>
  ) : (
    <section>
      <h3 className="settingSubheader">{summary}</h3>
      {children}
    </section>
  )
}

export default Collapsible
