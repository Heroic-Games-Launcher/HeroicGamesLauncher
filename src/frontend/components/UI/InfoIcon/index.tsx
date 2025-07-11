import './index.css'

import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

interface Props {
  text: string
}

export default function InfoIcon({ text }: Props) {
  return (
    <div className="InfoIcon">
      <FontAwesomeIcon className="helpIcon" icon={faCircleInfo} title={text} />
      <span>{text}</span>
    </div>
  )
}
