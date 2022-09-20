type ApiType = typeof import('../../backend/api').default

declare global {
  interface Window {
    api: ApiType
  }
}

export {}
