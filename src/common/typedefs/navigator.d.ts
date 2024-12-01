declare global {
  interface WindowControlsOverlay {
    visible: boolean
  }

  interface Navigator {
    windowControlsOverlay: WindowControlsOverlay
  }
}

export {}
