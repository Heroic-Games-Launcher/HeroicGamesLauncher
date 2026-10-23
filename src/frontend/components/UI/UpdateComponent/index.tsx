import { useTranslation } from 'react-i18next'
import ProgressBar from '../ProgressBar'
import './index.css'

interface UpdateComponentProps {
  message?: string
  progress?: number
  inline?: boolean
}

export default function UpdateComponent({
  message,
  progress,
  inline = false
}: UpdateComponentProps) {
  const { t } = useTranslation()
  if (message === undefined) {
    message = t('loading.default')
  }

  return (
    <div
      className={`UpdateComponent${inline ? ' UpdateComponent--inline' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="UpdateComponent__body">
        {message && <span className="UpdateComponent__message">{message}</span>}
        <ProgressBar
          value={progress}
          label={message}
          showValue={progress !== undefined}
        />
      </div>
    </div>
  )
}
