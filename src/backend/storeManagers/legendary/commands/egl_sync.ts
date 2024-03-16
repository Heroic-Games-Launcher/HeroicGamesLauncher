import type { Path } from 'backend/schemas'

interface EglSyncCommand {
  subcommand: 'egl-sync'
  '--egl-manifest-path'?: Path
  '--egl-wine-prefix'?: Path
  '--enable-sync'?: true
  '--disable-sync'?: true
  '--one-shot'?: true
  '--import-only'?: true
  '--export-only'?: true
  '--migrate'?: true
  '--unlink'?: true
}

export default EglSyncCommand
