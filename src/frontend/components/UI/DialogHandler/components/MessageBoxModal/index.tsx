import './index.css'
import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import { DialogType, ButtonOptions } from 'common/types'
interface MessageBoxModalProps {
  title: string
  message: string
  onClose: () => void
  buttons: Array<ButtonOptions>
  type: DialogType
}

const MessageBoxModal: React.FC<MessageBoxModalProps> = function (props) {
  const { t } = useTranslation()
  const getButtons = function () {
    const allButtons = []
    for (let i = 0; i < props.buttons.length; ++i) {
      allButtons.push(
        <button
          onClick={() => {
            props.onClose()
            props.buttons[i].onClick?.()
          }}
          className={`button is-secondary outline`}
          key={'messageBoxModalButton_' + i.toString()}
        >
          {props.buttons[i].text}
        </button>
      )
    }
    return allButtons
  }

  const getContent = () => {
    switch (props.type) {
      case 'ERROR':
        return (
          <>
            <div className="errorDialog contentHeader">
              {t('error', 'Error')}:
            </div>
            <div className="errorDialog error-box">
              {props.message.split('\n').map((line, key) => {
                return <p key={key}>{line}</p>
              })}
            </div>
          </>
        )
        break
      default:
        return props.message
        break
    }
  }

  return (
    <Dialog
      onClose={props.onClose}
      className={classNames({ errorDialog: props.type === 'ERROR' })}
    >
      <DialogHeader onClose={props.onClose} showCloseButton={true}>
        {props.title}
      </DialogHeader>
      <DialogContent>{getContent()}</DialogContent>
      <DialogFooter>{getButtons()}</DialogFooter>
    </Dialog>
  )
}

export default MessageBoxModal
