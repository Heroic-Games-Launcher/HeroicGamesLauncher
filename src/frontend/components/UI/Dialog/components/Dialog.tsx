import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
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
  showCloseButton: boolean
  onClose: () => void
}

export const Dialog: React.FC<DialogProps> = ({
  children,
  className,
  showCloseButton = false,
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
        const ev = e.nativeEvent as MouseEvent
        const tg = e.target as HTMLElement
        if (
          ev.offsetX < 0 ||
          ev.offsetX > tg.offsetWidth ||
          ev.offsetY < 0 ||
          ev.offsetY > tg.offsetHeight
        ) {
          onClose()
        }
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
        {showCloseButton && (
          <div className="Dialog__Close">
            <button className="Dialog__CloseButton" onClick={onClose}>
              <FontAwesomeIcon className="Dialog__CloseIcon" icon={faXmark} />
            </button>
          </div>
        )}
        {children}
      </dialog>
    </div>
  )
}
