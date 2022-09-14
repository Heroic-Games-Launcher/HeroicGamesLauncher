import React, {
  ReactNode,
  SyntheticEvent,
  useCallback,
  useEffect,
  useRef
} from 'react'

export interface DialogProps {
  className?: string
  children: ReactNode
  onClose: () => void
}

export const Dialog: React.FC<DialogProps> = ({
  children,
  className,
  onClose
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog) {
      const cancel = () => {
        onCloseRef.current()
      }
      dialog.addEventListener('cancel', cancel)
      dialog['showModal']()
      return () => {
        dialog.removeEventListener('cancel', cancel)
        dialog['close']()
      }
    }
    return
  }, [dialogRef.current])

  const onDialogClick = useCallback(
    (e: SyntheticEvent) => {
      if (e.target === dialogRef.current) {
        onClose()
      }
    },
    [onClose]
  )

  return (
    <div className="Dialog">
      <dialog
        className={`Dialog__element ${className}`}
        ref={dialogRef}
        onClick={onDialogClick}
      >
        {children}
      </dialog>
    </div>
  )
}
