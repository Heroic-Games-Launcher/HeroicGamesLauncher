import './index.css'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'

export function ErrorDialog(props: {
  title: string
  error: string
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <>
      <Dialog onClose={props.onClose} className={classNames('errorDialog')}>
        <DialogHeader onClose={props.onClose} showCloseButton={true}>
          <div>{props.title}</div>
        </DialogHeader>
        <DialogContent>
          <div className="errorDialog contentHeader">
            {t('error', 'Error')}:
          </div>
          <div className="errorDialog error-box">
            {props.error.split('\n').map((line, key) => {
              return <p key={key}>{line}</p>
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
