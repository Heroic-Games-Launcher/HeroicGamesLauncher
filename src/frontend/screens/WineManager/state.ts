import type { WineManagerStatus } from 'common/types'
import { create } from 'zustand'

const useWineManagerState = create<
  // FIXME: Enable noUncheckedIndexedAccess in tsconfig to remove this `undefined`
  Record<string, WineManagerStatus | undefined>
>(() => ({}))

window.api.handleProgressOfWineManager((_e, version, progress) => {
  useWineManagerState.setState({ [version]: progress })
})

export default useWineManagerState
