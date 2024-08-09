import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

interface GlobalStateV2 {
  uploadLogFileProps:
    | false
    | {
        appNameOrRunner: string
        name: string
      }
  setUploadLogFileProps: (props: GlobalStateV2['uploadLogFileProps']) => void

  showUploadedLogFileList: boolean
}

const useGlobalState = create<GlobalStateV2>()((set) => ({
  uploadLogFileProps: false,
  setUploadLogFileProps: (uploadLogFileProps) => {
    set({ uploadLogFileProps })
  },

  showUploadedLogFileList: false
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

export { useGlobalState, useShallowGlobalState }
