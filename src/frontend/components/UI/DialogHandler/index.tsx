import React from 'react'
import MessageBoxModal from './components/MessageBoxModal'
import {
  useGlobalState,
  useShallowGlobalState
} from 'frontend/state/GlobalStateV2'

export default function DialogHandler() {
  const { dialogModalOptions } = useShallowGlobalState('dialogModalOptions')

  return (
    <>
      {dialogModalOptions.showDialog && (
        <MessageBoxModal
          type={dialogModalOptions.type ? dialogModalOptions.type : 'MESSAGE'}
          title={dialogModalOptions.title ? dialogModalOptions.title : ''}
          message={dialogModalOptions.message ? dialogModalOptions.message : ''}
          buttons={dialogModalOptions.buttons ? dialogModalOptions.buttons : []}
          onClose={() =>
            useGlobalState.setState({
              dialogModalOptions: { showDialog: false }
            })
          }
        />
      )}
    </>
  )
}
