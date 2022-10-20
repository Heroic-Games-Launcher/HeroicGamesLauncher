import { ButtonOptions, DialogType } from 'common/types'
import ContextProvider from 'frontend/state/ContextProvider'
import React, { useEffect, useContext } from 'react'
import MessageBoxModal from './components/MessageBoxModal'
export default function DialogHandler() {
  const { dialogModalOptions, showDialogModal } = useContext(ContextProvider)

  useEffect(() => {
    const onMessage = (
      e: Electron.IpcRendererEvent,
      title: string,
      message: string,
      type: DialogType,
      buttons?: Array<ButtonOptions>
    ) => {
      showDialogModal({ title, message, type, buttons })
    }

    const removeHandleShowDialogListener =
      window.api.handleShowDialog(onMessage)

    //useEffect unmount
    return () => {
      removeHandleShowDialogListener()
    }
  }, [])

  return (
    <>
      {dialogModalOptions.showDialog && (
        <MessageBoxModal
          type={dialogModalOptions.type ? dialogModalOptions.type : 'MESSAGE'}
          title={dialogModalOptions.title ? dialogModalOptions.title : ''}
          message={dialogModalOptions.message ? dialogModalOptions.message : ''}
          buttons={dialogModalOptions.buttons ? dialogModalOptions.buttons : []}
          onClose={() => showDialogModal({ showDialog: false })}
        />
      )}
    </>
  )
}
