import { KeyboardEvent, ReactNode } from 'react'
import Panel from 'frontend/components/UI/Panel'
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
        <Panel
          key={i}
          padding="lg"
          className="HorizontalSelector__option"
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onClick()
            }
          }}
        >
          <span className="HorizontalSelector__icon">{icon}</span>
          <span className="HorizontalSelector__title">{title}</span>
          <span className="HorizontalSelector__subtitle">{subtitle}</span>
        </Panel>
      ))}
    </div>
  )
}
