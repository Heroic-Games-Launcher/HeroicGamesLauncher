import React from 'react'
import { Steps, StepsProps } from 'intro.js-react'
import 'intro.js/introjs.css'
import './Tour.scss'
import { useTranslation } from 'react-i18next'
import { useTour } from '../../state/TourContext'

export interface TourStep {
  intro: string
  element?: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto' | 'center'
  title?: string
}

interface TourProps {
  tourId: string
  steps: TourStep[]
  enabled?: boolean
  onComplete?: () => void
  onExit?: () => void
  options?: StepsProps['options']
}

const Tour: React.FC<TourProps> = ({
  tourId,
  steps,
  enabled = false,
  onComplete,
  onExit,
  options
}) => {
  const { t } = useTranslation()
  const { isTourActive, endTour } = useTour()

  const isActive = enabled || isTourActive(tourId)

  const defaultOptions = {
    nextLabel: t('tour.next', 'Next'),
    prevLabel: t('tour.back', 'Back'),
    skipLabel: t('tour.skip', 'Skip'),
    doneLabel: t('tour.done', 'Done'),
    showStepNumbers: false,
    showBullets: true,
    exitOnOverlayClick: true,
    disableInteraction: false,
    highlightClass: 'heroic-tour-highlight',
    tooltipClass: 'heroic-tour-tooltip',
    overlayOpacity: 0.7,
    scrollToElement: false,
    scrollPadding: 0
  }

  const handleComplete = () => {
    endTour(tourId, true)
    onComplete?.()
  }

  const handleExit = () => {
    endTour(tourId, false)
    onExit?.()
  }

  return (
    <Steps
      enabled={isActive}
      steps={steps}
      initialStep={0}
      onExit={handleExit}
      onComplete={handleComplete}
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      options={{
        ...defaultOptions,
        ...options
      }}
    />
  )
}

export default Tour
