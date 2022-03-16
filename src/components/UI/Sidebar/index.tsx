import React from 'react'
import SidebarLinks from './components/SidebarLinks'
import SidebarUtils from './components/SidebarUtils'
import './index.css'

export default function Sidebar() {
  return (
    <aside className="Sidebar">
      <SidebarLinks />
      <SidebarUtils />
    </aside>
  )
}
