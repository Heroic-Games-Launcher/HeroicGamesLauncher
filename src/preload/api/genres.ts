import { makeHandlerInvoker } from '../ipc'

export const getGenres = makeHandlerInvoker('getGenres')
export const refreshGenres = makeHandlerInvoker('refreshGenres')
