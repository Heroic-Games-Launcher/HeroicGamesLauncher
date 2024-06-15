import { create } from 'zustand'

interface GlobalStateV2 {
  isFullscreen: boolean
  isFrameless: boolean
}

const useGlobalState = create<GlobalStateV2>()(() => ({
  isFullscreen: false,
  isFrameless: false
}))

const setIsFullscreen = (isFullscreen: boolean) =>
  useGlobalState.setState({ isFullscreen })
window.api.isFullscreen().then(setIsFullscreen)
window.api.handleFullscreen((e, isFullscreen) => setIsFullscreen(isFullscreen))

const setIsFrameless = (isFrameless: boolean) =>
  useGlobalState.setState({ isFrameless })
window.api.isFrameless().then(setIsFrameless)

export { useGlobalState }
