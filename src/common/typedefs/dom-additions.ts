// These changes are not in the official types yet as they're not widely supported yet
declare global {
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/queryLocalFonts) */
  function queryLocalFonts(): Promise<FontData[]>

  interface Window {
    /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/queryLocalFonts) */
    queryLocalFonts(): Promise<FontData[]>
  }

  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/FontData) */
  interface FontData {
    /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/FontData/family) */
    family: string
    /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/FontData/fullName) */
    fullName: string
    /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/FontData/postscriptName) */
    postscriptName: string
    /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/FontData/style) */
    style: string
    /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/FontData/blob) */
    blob(): Promise<Blob>
  }

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
