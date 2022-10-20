import './index.css'

import React, { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import { LinearProgress } from '@mui/material'
import classNames from 'classnames'
import { useTranslation } from 'react-i18next'

export function ProgressDialog(props: {
  title: string
  progress: string[]
  showCloseButton: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const winetricksOutputBottomRef = useRef<HTMLDivElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const scrollToBottom = () => {
    winetricksOutputBottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom()
    }
  }, [props.progress, autoScroll])

  const onLogScroll = (ev: Event) => {
    const target = ev.target as HTMLDivElement

    const atTheBottom =
      target.scrollTop + target.getBoundingClientRect().height >=
      target.scrollHeight

    setAutoScroll(atTheBottom)
  }

  useEffect(() => {
    if (logRef.current) {
      logRef.current.addEventListener('scroll', onLogScroll)
    }
  }, [logRef.current])

  return (
    <>
      <Dialog onClose={props.onClose} className={classNames('progressDialog')}>
        <DialogHeader
          onClose={props.onClose}
          showCloseButton={props.showCloseButton}
        >
          <div>{props.title}</div>
        </DialogHeader>
        <DialogContent>
          <div className="progressDialog header">
            {t('progress', 'Progress')}:
          </div>
          <div className="progressDialog log-box" ref={logRef}>
            {props.progress.map((line, key) => {
              if (line.toLowerCase().includes(' err')) {
                return (
                  <p key={key} className="progressDialog log-error">
                    {line}
                  </p>
                )
              } else if (line.toLowerCase().includes(' warn')) {
                return (
                  <p key={key} className="progressDialog log-warning">
                    {line}
                  </p>
                )
              } else {
                return (
                  <p key={key} className="progressDialog log-info">
                    {line}
                  </p>
                )
              }
            })}
            <div ref={winetricksOutputBottomRef} />
          </div>
          <LinearProgress className="progressDialog linearProgress" />
        </DialogContent>
      </Dialog>
    </>
  )
}
