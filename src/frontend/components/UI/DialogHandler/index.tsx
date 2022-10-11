import ContextProvider from 'frontend/state/ContextProvider'
import React, { useEffect, useContext } from 'react'
import MessageBoxModal from '../Dialog/MessageBoxModal'
import { ErrorDialog } from './components/ErrorDialog'

export default function DialogHandler() {
  const { dialogModalOptions, showDialogModal } = useContext(ContextProvider)

  useEffect(() => {
    const onMessage = (
      e: Electron.IpcRendererEvent,
      title: string,
      message: string,
      isError: boolean,
      buttons: Array<string>
    ) => {
      showDialogModal({ title, message, isError, buttons })
    }

    const removeHandleShowDialogListener =
      window.api.handleShowDialog(onMessage)

    //useEffect unmount
    return () => {
      removeHandleShowDialogListener()
    }
  }, [])

  const buttonsOnClick: Array<() => void> = []
  if (dialogModalOptions.buttons) {
    for (let i = 0; i < dialogModalOptions.buttons.length; ++i) {
      /* eslint-disable @typescript-eslint/no-empty-function */
      const val =
        dialogModalOptions.buttonsOnClick &&
        i < dialogModalOptions.buttonsOnClick.length
          ? dialogModalOptions.buttonsOnClick[i]
          : () => {}
      /* eslint-enable @typescript-eslint/no-empty-function */
      buttonsOnClick.push(() => {
        val()
        showDialogModal({ showDialog: false })
      })
    }
  }

  return (
    <>
      {dialogModalOptions.showDialog &&
        (dialogModalOptions.isError ? (
          <ErrorDialog
            title={dialogModalOptions.title ? dialogModalOptions.title : ''}
            error={dialogModalOptions.message ? dialogModalOptions.message : ''}
            onClose={() => showDialogModal({ showDialog: false })}
          />
        ) : (
          <MessageBoxModal
            title={dialogModalOptions.title ? dialogModalOptions.title : ''}
            message={
              dialogModalOptions.message ? dialogModalOptions.message : ''
            }
            buttons={
              dialogModalOptions.buttons ? dialogModalOptions.buttons : []
            }
            buttonsOnClick={buttonsOnClick}
            onClose={() => showDialogModal({ showDialog: false })}
          />
        ))}
    </>
  )
}
