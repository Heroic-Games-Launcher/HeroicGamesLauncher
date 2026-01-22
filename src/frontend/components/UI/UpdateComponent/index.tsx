import { faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useTranslation } from 'react-i18next'
import './index.css'

interface UpdateComponentProps {
  message?: string
}

export default function UpdateComponent({ message }: UpdateComponentProps) {
  const { t } = useTranslation()
  if (message === undefined) {
    message = t('loading.default')
  }
  return (
    <div className="UpdateComponent">
      <FontAwesomeIcon icon={faSyncAlt} />
      {message && <div>{message}</div>}
    </div>
  )
}
