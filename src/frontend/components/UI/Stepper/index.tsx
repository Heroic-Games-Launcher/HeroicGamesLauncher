import { Check } from 'lucide-react'
import classNames from 'classnames'
import Icon from '../Icon'
import './index.scss'

export interface StepperStep {
  title: string
  description?: string
}

interface StepperProps {
  steps: StepperStep[]
  activeStep: number
  className?: string
}

type StepStatus = 'completed' | 'active' | 'upcoming'

export default function Stepper({
  steps,
  activeStep,
  className
}: StepperProps) {
  return (
    <ol className={classNames('Stepper', className)}>
      {steps.map((step, idx) => {
        const status: StepStatus =
          idx < activeStep
            ? 'completed'
            : idx === activeStep
              ? 'active'
              : 'upcoming'

        return (
          <li
            key={idx}
            className={classNames('Stepper__step', `Stepper__step--${status}`)}
            aria-current={status === 'active' ? 'step' : undefined}
          >
            <div className="Stepper__indicator">
              <span
                className="Stepper__connector Stepper__connector--before"
                aria-hidden
              />
              <span
                className="Stepper__connector Stepper__connector--after"
                aria-hidden
              />
              <span className="Stepper__badge">
                {status === 'completed' && (
                  <Icon glyph={Check} size="md" className="Stepper__check" />
                )}
                {status === 'active' && (
                  <span className="Stepper__number">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                )}
              </span>
            </div>
            <div className="Stepper__text">
              <span className="Stepper__title">{step.title}</span>
              {step.description && (
                <span className="Stepper__description">{step.description}</span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
