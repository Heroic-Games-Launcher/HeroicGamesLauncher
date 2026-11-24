import classNames from 'classnames'
import './index.scss'

interface DividerProps {
  className?: string
}

export default function Divider({ className }: DividerProps) {
  return <hr className={classNames('Divider', className)} />
}
