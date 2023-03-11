import Popover from '@mui/material/Popover/Popover'
import React, { useState } from 'react'
import './index.scss'

interface PopoverComponentProps {
  item: React.ReactElement
  children: React.ReactElement | React.ReactNode | React.ReactNode[]
}

const PopoverComponent: React.FC<PopoverComponentProps> = ({
  item,
  children
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    // if already open, close it
    if (open) {
      setAnchorEl(null)
      return
    }

    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  return (
    <>
      {React.cloneElement(item, {
        onClick: handleClick,
        style: { cursor: 'pointer' }
      })}
      <Popover
        id={item.props.id}
        open={open}
        anchorEl={anchorEl}
        onClick={handleClick}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left'
        }}
        classes={{
          paper: 'popover-paper'
        }}
      >
        {children}
      </Popover>
    </>
  )
}

export default PopoverComponent
