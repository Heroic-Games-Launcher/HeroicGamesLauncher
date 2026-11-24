import React from 'react'
import { useTranslation } from 'react-i18next'
import { CircleHelp } from 'lucide-react'
import { useTour } from '../../state/TourContext'
import Icon from 'frontend/components/UI/Icon'
import Tooltip from 'frontend/components/UI/Tooltip'
import './TourButton.scss'

interface TourButtonProps {
  tourId: string
  label?: string
  className?: string
}

const TourButton: React.FC<TourButtonProps> = ({
  tourId,
  label,
  className = ''
}) => {
  const { t } = useTranslation()
  const { startTour, resetTour, hasTourCompleted } = useTour()

  const handleStartTour = () => {
    if (hasTourCompleted(tourId)) {
      resetTour(tourId)
    }
    startTour(tourId)
  }

  const buttonLabel = label || t('tour.startTour', 'Start tour')

  return (
    <Tooltip content={buttonLabel} asChild>
      <button
        type="button"
        onClick={handleStartTour}
        className={`tour-button ${className}`}
        data-tour-button={tourId}
        aria-label={buttonLabel}
      >
        <Icon glyph={CircleHelp} size="lg" />
      </button>
    </Tooltip>
  )
}

export default TourButton
