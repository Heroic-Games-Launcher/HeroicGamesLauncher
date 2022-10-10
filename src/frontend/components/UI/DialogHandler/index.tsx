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
  if (dialogModalOptions.buttonsOnClick) {
    for (const val of dialogModalOptions.buttonsOnClick) {
      if (val === 'CLOSE') {
        buttonsOnClick.push(() => showDialogModal({ showDialog: false }))
      } else {
        buttonsOnClick.push(val)
      }
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
