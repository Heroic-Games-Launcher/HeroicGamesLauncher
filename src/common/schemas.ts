import { z } from 'zod'

const Runner = z.enum(['legendary', 'gog', 'nile', 'sideload', 'zoom'])
type Runner = z.infer<typeof Runner>

export { Runner }
