import { ReactNode } from 'react'
import Button from 'frontend/components/UI/Button'
import './index.scss'

interface SelectorOption {
  icon: ReactNode
  title: string
  subtitle: string
  onClick: () => void
}

interface Props {
  options: SelectorOption[]
}

export default function HorizontalSelector({ options }: Props) {
  return (
    <div className="HorizontalSelector">
      {options.map(({ icon, title, subtitle, onClick }, i) => (
        <Button
          key={i}
          variant="ghost"
          className="HorizontalSelector__option"
          onClick={onClick}
        >
          <span className="HorizontalSelector__icon">{icon}</span>
          <span className="HorizontalSelector__title">{title}</span>
          <span className="HorizontalSelector__subtitle">{subtitle}</span>
        </Button>
      ))}
    </div>
  )
}
