import { makeHandlerInvoker } from '../ipc'

export const getAutoCategories = makeHandlerInvoker('getAutoCategories')
export const refreshAutoCategories = makeHandlerInvoker('refreshAutoCategories')
