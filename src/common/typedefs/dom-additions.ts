// These changes are not in the official types yet as they're not widely supported yet
declare global {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/WindowControlsOverlay) */
  interface WindowControlsOverlay {
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/WindowControlsOverlay/visible) */
    visible: boolean
  }

  interface Navigator {
    /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Navigator/windowControlsOverlay) */
    readonly windowControlsOverlay: WindowControlsOverlay
  }
}

export {}
