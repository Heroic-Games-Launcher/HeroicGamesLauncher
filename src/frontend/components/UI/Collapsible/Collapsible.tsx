import React from 'react'

type Props = {
  isOpen: boolean
  summary: string
  children: React.ReactNode
  isCollapsible?: boolean
}

const Collapsible = ({ isOpen, isCollapsible, children, summary }: Props) => {
  return isCollapsible ? (
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
