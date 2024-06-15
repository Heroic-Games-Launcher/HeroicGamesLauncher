import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import i18next from 'i18next'
import { configStore } from '../helpers/electronStores'

const RTL_LANGUAGES = ['fa', 'ar']

interface GlobalStateV2 {
  isFullscreen: boolean
  isFrameless: boolean

  language: string
  isRTL: boolean
  setLanguage: (language: string) => void
}

const useGlobalState = create<GlobalStateV2>()((set) => ({
  isFullscreen: false,
  isFrameless: false,

  language: configStore.get('language', 'en'),
  isRTL: RTL_LANGUAGES.includes(configStore.get('language', 'en')),
  setLanguage: (language) => {
    window.api.changeLanguage(language)
    configStore.set('language', language)
    i18next.changeLanguage(language)

    const isRTL = RTL_LANGUAGES.includes(language)
    document.body.classList.toggle('isRTL', isRTL)

    set({ language, isRTL })
  }
}))

// Picks out properties described by `keys` from GlobalStateV2. Only causes
// a re-render if one of the listed properties changes. Returns an object with
// all specified keys
// Equivalent to `const foo = useGlobalState(useShallow((state) => state.foo))`
// for each key provided
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

const setIsFullscreen = (isFullscreen: boolean) =>
  useGlobalState.setState({ isFullscreen })
window.api.isFullscreen().then(setIsFullscreen)
window.api.handleFullscreen((e, isFullscreen) => setIsFullscreen(isFullscreen))

const setIsFrameless = (isFrameless: boolean) =>
  useGlobalState.setState({ isFrameless })
window.api.isFrameless().then(setIsFrameless)

export { useGlobalState, useShallowGlobalState }
