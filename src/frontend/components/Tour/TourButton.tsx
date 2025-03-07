import React from 'react'
import { useTranslation } from 'react-i18next'
import { useTour } from '../../state/TourContext'
import './TourButton.scss'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { IconButton, Tooltip } from '@mui/material'

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

  const buttonLabel = label || t('tour.startTour', 'Start Tour')

  return (
    <Tooltip title={buttonLabel}>
      <IconButton
        onClick={handleStartTour}
        className={`tour-button ${className}`}
        data-tour-button={tourId}
        size="small"
      >
        <HelpOutlineIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  )
}

export default TourButton
