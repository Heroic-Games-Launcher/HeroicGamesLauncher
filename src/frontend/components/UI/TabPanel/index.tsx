import React, { HTMLProps } from 'react'

type TabPanelProps = HTMLProps<HTMLDivElement> & {
  children?: React.ReactNode
  index: string
  value: string
}

function TabPanel(props: Readonly<TabPanelProps>) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <div>{children}</div>}
    </div>
  )
}

export default TabPanel
