import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'
import { Dialog as MuiDialog, IconButton } from '@mui/material'
import { X } from 'lucide-react'
import classNames from 'classnames'

import Icon from 'frontend/components/UI/Icon'
import ContextProvider from 'frontend/state/ContextProvider'

type ModalSize = 'sm' | 'md' | 'lg'
type ModalTone = 'default' | 'destructive' | 'error'

interface ModalProps {
  children: ReactNode
  onClose: () => void
  size?: ModalSize
  tone?: ModalTone
  fullHeight?: boolean
  showCloseButton?: boolean
  className?: string
}

export const Modal: React.FC<ModalProps> = ({
  children,
  onClose,
  size = 'md',
  tone = 'default',
  fullHeight = false,
  showCloseButton = false,
  className
}) => {
  const [open, setOpen] = useState(true)
  const { disableDialogBackdropClose } = useContext(ContextProvider)

  useEffect(() => {
    // HACK: Focussing the dialog using JS does not seem to work
    //       Instead, simulate one or two tab presses
    // One tab to focus the dialog
    window.api.gamepadAction({ action: 'tab' })
    // Second tab to skip the close button if it's shown
    if (showCloseButton) window.api.gamepadAction({ action: 'tab' })
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    onClose()
  }, [onClose])

  return (
    <MuiDialog
      open={open}
      onClose={(e, reason) => {
        if (disableDialogBackdropClose && reason === 'backdropClick') return
        close()
      }}
      scroll="paper"
      maxWidth={false}
      PaperProps={{
        className: classNames(
          'Modal',
          `Modal--${size}`,
          `Modal--${tone}`,
          { 'Modal--fullHeight': fullHeight },
          className
        )
      }}
    >
      <IconButton
        aria-label="close"
        className="Modal__closeButton"
        onClick={close}
        // showCloseButton used for gamepad back actions, should always be in DOM
        sx={{ display: showCloseButton ? 'inline-flex' : 'none' }}
      >
        <Icon glyph={X} size="lg" />
      </IconButton>
      {children}
    </MuiDialog>
  )
}
