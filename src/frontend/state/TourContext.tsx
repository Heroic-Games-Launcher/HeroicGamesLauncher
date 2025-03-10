import React, { createContext, useState, useContext, ReactNode } from 'react'

// Define the shape of our tour state
type TourState = {
  activeTour: string | null
  tourProgress: Record<string, boolean>
  completedTours: string[]
}

// Define the context value shape
type TourContextType = {
  tourState: TourState
  startTour: (tourId: string) => void
  endTour: (tourId: string, completed?: boolean) => void
  resetTour: (tourId: string) => void
  isTourActive: (tourId: string) => boolean
  hasTourCompleted: (tourId: string) => boolean
}

const defaultState: TourState = {
  activeTour: null,
  tourProgress: {},
  completedTours: []
}

// Create the context with a default value
const TourContext = createContext<TourContextType>({
  tourState: defaultState,
  startTour: () => {},
  endTour: () => {},
  resetTour: () => {},
  isTourActive: () => false,
  hasTourCompleted: () => false
})

type TourProviderProps = {
  children: ReactNode
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const [tourState, setTourState] = useState<TourState>(() => {
    // Try to load tour state from localStorage
    const savedState = localStorage.getItem('heroic-tour-state') || undefined
    return savedState ? (JSON.parse(savedState) as TourState) : defaultState
  })

  // Save state to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('heroic-tour-state', JSON.stringify(tourState))
  }, [tourState])

  const startTour = (tourId: string) => {
    setTourState((prev) => ({
      ...prev,
      activeTour: tourId
    }))
  }

  const endTour = (tourId: string, completed = false) => {
    setTourState((prev) => ({
      ...prev,
      activeTour: null,
      completedTours: completed
        ? [...prev.completedTours, tourId]
        : prev.completedTours
    }))
  }

  const resetTour = (tourId: string) => {
    setTourState((prev) => ({
      ...prev,
      completedTours: prev.completedTours.filter((id) => id !== tourId)
    }))
  }

  const isTourActive = (tourId: string) => tourState.activeTour === tourId

  const hasTourCompleted = (tourId: string) =>
    tourState.completedTours.includes(tourId)

  return (
    <TourContext.Provider
      value={{
        tourState,
        startTour,
        endTour,
        resetTour,
        isTourActive,
        hasTourCompleted
      }}
    >
      {children}
    </TourContext.Provider>
  )
}

// Custom hook to use the tour context
export const useTour = () => useContext(TourContext)
