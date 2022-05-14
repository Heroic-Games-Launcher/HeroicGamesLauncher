import * as React from 'react'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import './index.css'

export interface Item {
  label: string
  onclick: () => void
  show: boolean
}

interface Props {
  children: React.ReactNode
  items: Item[]
}

export default function ContextMenu({ children, items }: Props) {
  const [contextMenu, setContextMenu] = React.useState<{
    mouseX: number
    mouseY: number
  } | null>(null)

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4
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
            : undefined
        }
      >
        {items.map(
          ({ label, onclick, show }, i) =>
            show && (
              <MenuItem key={i} onClick={() => handleClick(onclick)}>
                {label}
              </MenuItem>
            )
        )}
      </Menu>
    </div>
  )
}
