import './index.css'
import React, { ReactElement, useMemo } from 'react'
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader
} from 'frontend/components/UI/Modal'
import Button from 'frontend/components/UI/Button'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'
import { DialogType, ButtonOptions } from 'common/types'
interface MessageBoxModalProps {
  title: string
  message: string | ReactElement
  onClose: () => void
  buttons: Array<ButtonOptions>
  type: DialogType
  className?: string
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
  const { className: customClassName } = props

  const message = useMemo(() => {
    if (typeof props.message === 'string') return decodeHTML(props.message)
    else return props.message
  }, [props.message])

  const getButtons = function () {
    return props.buttons.map((button, i) => (
      <Button
        key={'messageBoxModalButton_' + i.toString()}
        variant={button.variant ?? (i === 0 ? 'primary' : 'secondary')}
        onClick={() => {
          props.onClose()
          button.onClick?.()
        }}
      >
        {button.text}
      </Button>
    ))
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
      default:
        return props.message
    }
  }

  return (
    <Modal
      onClose={props.onClose}
      showCloseButton
      tone={props.type === 'ERROR' ? 'error' : 'default'}
      className={classNames(
        { errorDialog: props.type === 'ERROR' },
        customClassName
      )}
    >
      <ModalHeader>{props.title}</ModalHeader>
      <ModalContent>{getContent()}</ModalContent>
      <ModalFooter layout={props.buttons.length > 2 ? 'stacked' : 'inline'}>
        {getButtons()}
      </ModalFooter>
    </Modal>
  )
}

export default MessageBoxModal
