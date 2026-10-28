// Avoids loading real ipc import cycle
export const addListener = jest.fn()
export const addOneTimeListener = jest.fn()
export const addTestOnlyListener = jest.fn()
export const addHandler = jest.fn()
export const sendFrontendMessage = jest.fn()
