import { addHandler } from '../ipc'

addHandler('game.supportsChangelogs', (_e, game) => !!game.getChangelog)

addHandler(
  'game.getChangelog',
  async (_e, game) => game.getChangelog?.() ?? null
)
