import { create } from 'zustand'
import type { DisplayUnits } from 'common/format'

interface DisplayUnitsState {
  units: DisplayUnits
  setUnits: (units: DisplayUnits) => void
}

export const useDisplayUnits = create<DisplayUnitsState>((set) => ({
  units: 'mib',
  setUnits: (units) => set({ units })
}))

if (typeof window !== 'undefined' && window.api?.requestAppSettings) {
  void window.api
    .requestAppSettings()
    .then(({ downloadUnits }) =>
      useDisplayUnits.getState().setUnits(downloadUnits)
    )
}
