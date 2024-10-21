import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import ContextProvider from 'frontend/state/ContextProvider'
import React, {
  KeyboardEvent,
  ReactNode,
  SyntheticEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'

interface DialogProps {
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
  const [focusOnClose, setFocusOnClose] = useState<HTMLElement | null>(null)
  const { disableDialogBackdropClose } = useContext(ContextProvider)

  useEffect(() => {
    setFocusOnClose(document.querySelector<HTMLElement>('*:focus'))
  }, [])

  const close = () => {
    onCloseRef.current()
    if (focusOnClose) {
      setTimeout(() => focusOnClose.focus(), 200)
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog) {
      const cancel = () => {
        close()
      }
      dialog.addEventListener('cancel', cancel)

      if (disableDialogBackdropClose) {
        dialog['showPopover']()

        return () => {
          dialog.removeEventListener('cancel', cancel)
          dialog['hidePopover']()
        }
      } else {
        dialog.showModal()

        return () => {
          dialog.removeEventListener('cancel', cancel)
          dialog.close()
        }
      }
    }
    return
  }, [dialogRef.current, disableDialogBackdropClose])

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
          close()
        }
      }
    },
    [onClose]
  )

  const closeIfEsc = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      close()
    }
  }

  return (
    <div className="Dialog">
      <dialog
        className={`Dialog__element ${className}`}
        ref={dialogRef}
        onClick={onDialogClick}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore, this feature is new and not yet typed
        popover="manual"
        onKeyUp={closeIfEsc}
      >
        {showCloseButton && (
          <div className="Dialog__Close">
            <button className="Dialog__CloseButton" onClick={close}>
              <FontAwesomeIcon className="Dialog__CloseIcon" icon={faXmark} />
            </button>
          </div>
        )}
        {children}
      </dialog>
    </div>
  )
}
