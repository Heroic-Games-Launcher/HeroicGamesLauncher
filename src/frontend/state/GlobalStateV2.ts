import { create } from 'zustand'

interface GlobalStateV2 {
  isFullscreen: boolean
}

const useGlobalState = create<GlobalStateV2>()(() => ({
  isFullscreen: false
}))

const setIsFullscreen = (isFullscreen: boolean) =>
  useGlobalState.setState({ isFullscreen })
window.api.isFullscreen().then(setIsFullscreen)
window.api.handleFullscreen((e, isFullscreen) => setIsFullscreen(isFullscreen))

export { useGlobalState }
