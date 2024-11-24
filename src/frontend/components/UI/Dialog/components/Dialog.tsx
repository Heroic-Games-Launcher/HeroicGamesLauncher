import React, {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'
import {
  Dialog as MuiDialog,
  DialogContent,
  IconButton,
  Paper,
  styled
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

import ContextProvider from 'frontend/state/ContextProvider'

interface DialogProps {
  className?: string
  children: ReactNode
  showCloseButton: boolean
  onClose: () => void
}

const StyledPaper = styled(Paper)(() => ({
  backgroundColor: 'var(--modal-background)',
  color: 'var(--text-default)',
  maxWidth: '100%',
  '&:has(.settingsDialogContent)': {
    height: '80%'
  }
}))

export const Dialog: React.FC<DialogProps> = ({
  children,
  className,
  showCloseButton = false,
  onClose
}) => {
  const [open, setOpen] = useState(true)
  const [focusOnClose, setFocusOnClose] = useState<HTMLElement | null>(null)
  const { disableDialogBackdropClose } = useContext(ContextProvider)

  useEffect(() => {
    setFocusOnClose(document.querySelector<HTMLElement>('*:focus'))
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    onClose()
    if (focusOnClose) {
      setTimeout(() => focusOnClose.focus(), 200)
    }
  }, [onClose, focusOnClose])

  return (
    <MuiDialog
      open={open}
      onClose={close}
      scroll="paper"
      maxWidth="md"
      PaperComponent={StyledPaper}
      PaperProps={{
        className
      }}
      disableEscapeKeyDown={disableDialogBackdropClose}
      sx={{
        '& .Dialog__element': {
          maxWidth: 'min(700px, 85vw)',
          paddingTop: 'var(--dialog-margin-vertical)'
        }
      }}
    >
      <>
        {showCloseButton && (
          <IconButton
            aria-label="close"
            onClick={close}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'var(--text-default)'
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
        <DialogContent>{children}</DialogContent>
      </>
    </MuiDialog>
  )
}
