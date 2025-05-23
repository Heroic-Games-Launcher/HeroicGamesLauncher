type ApiType = typeof import('../../preload/api').default

declare global {
  interface Window {
    api: ApiType
  }
}

export {}
