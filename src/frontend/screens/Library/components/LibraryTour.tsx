import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import Tour from '../../../components/Tour/Tour'
import { useTour } from '../../../state/TourContext'
import ContextProvider from 'frontend/state/ContextProvider'
import { buildLibraryTourSteps } from './libraryTourSteps'

export const LIBRARY_TOUR_ID = 'library-tour'

const LibraryTour: React.FC = () => {
  const { t } = useTranslation()
  const { isTourActive } = useTour()
  const { epic, gog, amazon, zoom, itchio, steam, sideloadedLibrary } =
    useContext(ContextProvider)

  const hasGames = Boolean(
    epic.library.length ||
    gog.library.length ||
    amazon.library.length ||
    zoom.library.length ||
    itchio.library.length ||
    steam.library.length ||
    sideloadedLibrary.length
  )

  const steps = buildLibraryTourSteps({
    t,
    hasGames,
    includeWelcome: true,
    includeEnd: true
  })

  return (
    <Tour
      tourId={LIBRARY_TOUR_ID}
      steps={steps}
      enabled={isTourActive(LIBRARY_TOUR_ID)}
    />
  )
}

export default LibraryTour
