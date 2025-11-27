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

  // A loose typedef of Intl.DurationFormat
  // Can be removed once <https://github.com/microsoft/TypeScript/issues/60608> is closed
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Intl {
    interface DurationFormatOptionsStyleRegistry {
      long: never
      short: never
      narrow: never
      digital: never
    }

    type DurationFormatOptionsStyle = keyof DurationFormatOptionsStyleRegistry

    interface DurationFormatOptions {
      localeMatcher?: 'lookup' | 'best fit' | undefined
      numberingSystem?: string | undefined
      style?: DurationFormatOptionsStyle | undefined
      years?: 'long' | 'short' | 'narrow' | undefined
      yearsDisplay?: 'always' | 'auto' | undefined
      months?: 'long' | 'short' | 'narrow' | undefined
      monthsDisplay?: 'always' | 'auto' | undefined
      weeks?: 'long' | 'short' | 'narrow' | undefined
      weeksDisplay?: 'always' | 'auto' | undefined
      days?: 'long' | 'short' | 'narrow' | undefined
      daysDisplay?: 'always' | 'auto' | undefined
      hours?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit' | undefined
      hoursDisplay?: 'always' | 'auto' | undefined
      minutes?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit' | undefined
      minutesDisplay?: 'always' | 'auto' | undefined
      seconds?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit' | undefined
      secondsDisplay?: 'always' | 'auto' | undefined
      milliseconds?: 'long' | 'short' | 'narrow' | 'numeric' | undefined
      millisecondsDisplay?: 'always' | 'auto' | undefined
      microseconds?: 'long' | 'short' | 'narrow' | 'numeric' | undefined
      microsecondsDisplay?: 'always' | 'auto' | undefined
      nanoseconds?: 'long' | 'short' | 'narrow' | 'numeric' | undefined
      nanosecondsDisplay?: 'always' | 'auto' | undefined
      fractionalDigits?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | undefined
    }

    interface DurationFormatConstructor {
      new (
        locales: LocalesArgument,
        options?: DurationFormatOptions
      ): DurationFormat
    }

    interface DurationFormatObject {
      years?: number
      months?: number
      weeks?: number
      days?: number
      hours?: number
      minutes?: number
      seconds?: number
      milliseconds?: number
      microseconds?: number
      nanoseconds?: number
    }

    interface DurationFormat {
      format(value: DurationFormatObject): string
    }

    const DurationFormat: DurationFormatConstructor
  }
}

export {}
