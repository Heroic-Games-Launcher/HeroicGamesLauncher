import './index.css'
import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader
} from 'frontend/components/UI/Dialog'

interface MessageBoxModalProps {
  title: string
  message: string
  onClose: () => void
  buttons: Array<string>
  buttonsOnClick: Array<() => void>
}

const MessageBoxModal: React.FC<MessageBoxModalProps> = function (props) {
  const getButtons = function () {
    const allButtons = []
    for (
      let i = 0;
      i < props.buttons.length && i < props.buttonsOnClick.length;
      ++i
    ) {
      allButtons.push(
        <button
          onClick={props.buttonsOnClick[i]}
          className={`button is-secondary outline`}
          key={'messageBoxModalButton_' + i.toString()}
        >
          {props.buttons[i]}
        </button>
      )
    }
    return allButtons
  }

  return (
    <Dialog onClose={props.onClose}>
      <DialogHeader onClose={props.onClose} showCloseButton={true}>
        {props.title}
      </DialogHeader>
      <DialogContent>{props.message}</DialogContent>
      <DialogFooter>{getButtons()}</DialogFooter>
    </Dialog>
  )
}

export default MessageBoxModal
