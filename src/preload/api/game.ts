import { makeHandlerInvoker } from '../ipc'

export const game = {
  supportsChangelogs: makeHandlerInvoker('game.supportsChangelogs'),
  getChangelog: makeHandlerInvoker('game.getChangelog'),
  getGenres: makeHandlerInvoker('game.getGenres'),
  getReleaseDate: makeHandlerInvoker('game.getReleaseDate'),
  getDescription: makeHandlerInvoker('game.getDescription'),
  supportsRequirements: makeHandlerInvoker('game.supportsRequirements'),
  getRequirements: makeHandlerInvoker('game.getRequirements')
}
