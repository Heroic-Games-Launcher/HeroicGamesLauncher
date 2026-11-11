import { CircularProgress } from '@mui/material'
import './index.scss'

interface Props {
  text: string
  onClick?: () => void
}

export default function TextWithProgress({ text, onClick }: Props) {
  return (
    <div
      className="textWithProgress"
      role={onClick ? 'button' : 'status'}
      onClick={onClick}
    >
      <CircularProgress className="progress" color="inherit" size={20} />
      <span className="feedback-text">{text}</span>
    </div>
  )
}
