import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
  disableBackdropClose?: boolean
}

export const Modal: React.FC<ModalProps> = ({
  children,
  onClose,
  size = 'md',
  tone = 'default',
  fullHeight = false,
  showCloseButton = false,
  className,
  disableBackdropClose = false
}) => {
  const [open, setOpen] = useState(true)
  const { disableDialogBackdropClose } = useContext(ContextProvider)

  // Captured during the first render, before MUI moves focus into the dialog.
  const previouslyFocused = useRef<HTMLElement | null>(null)
  if (previouslyFocused.current === null) {
    previouslyFocused.current = document.activeElement as HTMLElement | null
  }

  useEffect(() => {
    // MUI focuses the dialog paper on open; restore the opener on unmount so
    // the gamepad does not end up with nothing focused.
    const opener = previouslyFocused.current
    return () => {
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    onClose()
  }, [onClose])

  return (
    <MuiDialog
      open={open}
      onClose={(e, reason) => {
        if (disableBackdropClose && reason === 'backdropClick') return
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
