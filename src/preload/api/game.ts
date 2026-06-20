import { makeHandlerInvoker } from '../ipc'

export const game = {
  supportsChangelogs: makeHandlerInvoker('game.supportsChangelogs'),
  getChangelog: makeHandlerInvoker('game.getChangelog')
}
