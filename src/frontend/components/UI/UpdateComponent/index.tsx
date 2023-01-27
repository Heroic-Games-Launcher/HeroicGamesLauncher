import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import cx from 'classnames'
import React, { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import './index.css'

interface UpdateComponentProps {
  message?: string
  inline?: boolean
}

export function UpdateComponentBase({
  message = 'Loading',
  inline = false
}: UpdateComponentProps) {
  const componentRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const observer = useMemo(() => {
    return new IntersectionObserver(
      (entries) => {
        if (wrapperRef.current) {
          for (const entry of entries) {
            const ratio =
              entry.intersectionRect.height / entry.boundingClientRect.height
            wrapperRef.current.style.height = `${100 * ratio}%`
          }
        }
      },
      {
        threshold: Array(100)
          .fill(0)
          .map((_, i) => (i + 1) / 100)
      }
    )
  }, [wrapperRef.current])

  useEffect(() => {
    return () => observer.disconnect()
  }, [observer])

  useEffect(() => {
    if (inline) {
      const component = componentRef.current
      if (component) {
        observer.observe(component)
        return () => {
          observer.unobserve(component)
        }
      }
    }
    return
  }, [inline, observer, componentRef.current])

  return (
    <div
      className={cx('UpdateComponent', {
        'UpdateComponent--inline': inline,
        'UpdateComponent--topLevel': !inline
      })}
      data-testid="updateComponent"
      ref={componentRef}
    >
      <div
        className="UpdateComponent__wrapper"
        data-testid="updateComponent"
        ref={wrapperRef}
      >
        <FontAwesomeIcon className="UpdateComponent__icon" icon={faSyncAlt} />
        {message && <div>{message}</div>}
      </div>
    </div>
  )
}
export default function UpdateComponent({
  message,
  ...rest
}: UpdateComponentProps) {
  const { t } = useTranslation()
  if (message === undefined) {
    message = t('loading.default')
  }
  return <UpdateComponentBase message={message} {...rest} />
}
