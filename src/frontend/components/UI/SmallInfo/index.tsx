import cx from 'classnames'

import './index.css'

type Props = {
  handleclick?: () => void
  subtitle?: string
  title: string
}

export default function SmallInfo({ handleclick, subtitle, title }: Props) {
  const handleOnClick = () => {
    return handleclick ? handleclick() : null
  }
  return (
    <div
      className={cx('smallInfo', { clickable: handleclick })}
      onClick={handleclick ? handleOnClick : undefined}
    >
      <span className="smallTitle">{title}</span> <br />
      <span className="smallsubtitle">{subtitle}</span>
    </div>
  )
}
