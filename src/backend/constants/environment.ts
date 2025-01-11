import { env } from 'process'

export const isSnap = Boolean(env.SNAP)
