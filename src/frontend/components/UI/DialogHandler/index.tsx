import React, { useEffect, useState } from 'react'
import { ErrorDialog } from './components/ErrorDialog'

export default function DialogHandler() {
  const [showErrorDialog, setShowErrorDialog] = useState(false)
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
      setShowErrorDialog(true)
    }

    const removeHandleShowErrorDialogListener =
      window.api.handleShowErrorDialog(onError)

    //useEffect unmount
    return () => {
      removeHandleShowErrorDialogListener()
    }
  }, [])

  function onCloseErrorDialog() {
    setShowErrorDialog(false)
  }

  return (
    <>
      {showErrorDialog && (
        <ErrorDialog
          title={errorTitle}
          error={errorMessage}
          onClose={onCloseErrorDialog}
        />
      )}
    </>
  )
}
