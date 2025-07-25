import React, { type ReactElement } from 'react'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import './index.css'
import { ListItemIcon } from '@mui/material'

export interface Item {
  icon: ReactElement
  label: string
  onclick: () => void
  show: boolean
}

interface Props {
  children: React.ReactNode
  items: Item[]
}

function ContextMenu({ children, items }: Props) {
  const [contextMenu, setContextMenu] = React.useState<{
    mouseX: number
    mouseY: number
  } | null>(null)

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX,
            mouseY: event.clientY - 2
          }
        : null
    )
  }

  const handleClose = () => {
    setContextMenu(null)
  }

  const handleClick = (callback: { (): void }) => {
    handleClose()
    callback()
  }

  return (
    <div onContextMenu={handleContextMenu} style={{ cursor: 'context-menu' }}>
      {children}
      <Menu
        open={contextMenu !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        className="contextMenu"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : { top: 0, left: 0 }
        }
      >
        {items.map(
          ({ label, onclick, show, icon }, i) =>
            show && (
              <MenuItem key={i} onClick={() => handleClick(onclick)}>
                <ListItemIcon>{icon}</ListItemIcon>
                {label}
              </MenuItem>
            )
        )}
      </Menu>
    </div>
  )
}

export default React.memo(ContextMenu)
