import ContextProvider from 'frontend/state/ContextProvider'
import React, { useEffect, useState, useContext } from 'react'
import MessageBoxModal from '../Dialog/MessageBoxModal'
import { ErrorDialog } from './components/ErrorDialog'

export default function DialogHandler() {
  const { dialogModalOptions, showDialogModal } = useContext(ContextProvider)

  const [errorTitle, setErrorTitle] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const onError = (
      e: Electron.IpcRendererEvent,
      title: string,
      error: string
    ) => {
      setErrorTitle(title)
      setErrorMessage(error)
    }

    const removeHandleShowErrorDialogListener =
      window.api.handleShowErrorDialog(onError)

    //useEffect unmount
    return () => {
      removeHandleShowErrorDialogListener()
    }
  }, [])

  const buttonsOnClick: Array<() => void> = []
  if (dialogModalOptions.buttons) {
    for (let i = 0; i < dialogModalOptions.buttons.length; ++i) {
      if (!dialogModalOptions.buttonsOnClick) {
        break
      }
      /*eslint-disable @typescript-eslint/no-empty-function*/
      const val =
        i < dialogModalOptions.buttonsOnClick.length
          ? dialogModalOptions.buttonsOnClick[i]
          : () => {}
      /*eslint-enable @typescript-eslint/no-empty-function*/
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
            title={errorTitle}
            error={errorMessage}
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
