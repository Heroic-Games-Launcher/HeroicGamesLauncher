import './index.css'
import React, { useMemo } from 'react'
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

// This function proper parses the message from the backend and returns HTML code with an array of spans and paragraphs
function decodeHTML(html: string): Array<JSX.Element> {
  const txt = document.createElement('textarea')
  txt.innerHTML = html
  return txt.value.split('\n').map((item, key) => {
    return (
      <span key={key}>
        {item}
        <p />
      </span>
    )
  })
}

const MessageBoxModal: React.FC<MessageBoxModalProps> = function (props) {
  const { t } = useTranslation()

  const message = useMemo(() => decodeHTML(props.message), [props.message])

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
            <div className="errorDialog error-box">{message}</div>
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
      showCloseButton
      className={classNames({ errorDialog: props.type === 'ERROR' })}
    >
      <DialogHeader onClose={props.onClose}>{props.title}</DialogHeader>
      <DialogContent>{getContent()}</DialogContent>
      <DialogFooter>{getButtons()}</DialogFooter>
    </Dialog>
  )
}

export default MessageBoxModal
