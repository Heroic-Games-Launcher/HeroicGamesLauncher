import z from 'zod'

const MinimalGameInfoBase = z.object({
  appName: z.string(),
  platform: z.enum(['win32', 'darwin', 'linux']),
  version: z.string(),
  // Folder name/path relative to the library path
  folderName: z.string()
})

const MinimalGameInfoLegendary = MinimalGameInfoBase.extend({
  runner: z.literal('legendary'),
  installTags: z.string().optional()
})

const MinimalGameInfoGog = MinimalGameInfoBase.extend({
  runner: z.literal('gog'),
  // TODO: Are these correct? Does GOG need anything else?
  language: z.string(),
  branch: z.string()
})

const MinimalGameInfoAmazon = MinimalGameInfoBase.extend({
  runner: z.literal('nile')
  // TODO: Same as above: Does Amazon need anything at all here?
})

const MinimalGameInfo = z.discriminatedUnion('runner', [
  MinimalGameInfoLegendary,
  MinimalGameInfoGog,
  MinimalGameInfoAmazon
])
type MinimalGameInfo = z.infer<typeof MinimalGameInfo>

const SerializedLibraryInfo = z.object({
  name: z.string(),
  games: MinimalGameInfo.array()
})
type SerializedLibraryInfo = z.infer<typeof SerializedLibraryInfo>

export { SerializedLibraryInfo, MinimalGameInfo }
