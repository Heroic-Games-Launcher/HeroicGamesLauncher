import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import type { LibraryInfo } from 'backend/libraries/types'

interface GlobalStateV2 {
  uploadLogFileProps:
    | false
    | {
        appNameOrRunner: string
        name: string
      }
  setUploadLogFileProps: (props: GlobalStateV2['uploadLogFileProps']) => void

  showUploadedLogFileList: boolean

  libraries: Record<string, LibraryInfo | false>
}

const useGlobalState = create<GlobalStateV2>()((set) => ({
  uploadLogFileProps: false,
  setUploadLogFileProps: (uploadLogFileProps) => {
    set({ uploadLogFileProps })
  },

  showUploadedLogFileList: false,

  libraries: {}
}))

function useShallowGlobalState<Keys extends (keyof GlobalStateV2)[]>(
  ...keys: Keys
): Pick<GlobalStateV2, Keys[number]> {
  return useGlobalState(
    useShallow(
      (state) =>
        Object.fromEntries(keys.map((key) => [key, state[key]])) as {
          [key in Keys[number]]: GlobalStateV2[key]
        }
    )
  )
}

void window.api.libraries
  .getAll()
  .then((libraries) => useGlobalState.setState({ libraries }))
window.api.libraries.onLibraryPush((e, library) =>
  useGlobalState.setState((state) => ({
    libraries: {
      ...state.libraries,
      [library[0]]: library[1]
    }
  }))
)
window.api.libraries.onLibraryDelete((e, path) => {
  const { libraries } = useGlobalState.getState()
  delete libraries[path]
  useGlobalState.setState({
    libraries: {
      ...libraries
    }
  })
})

export { useGlobalState, useShallowGlobalState }
