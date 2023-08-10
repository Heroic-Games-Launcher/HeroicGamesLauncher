import { Path } from './base'

interface EglSyncCommand {
  subcommand: 'egl-sync'
  '--enable-sync'?: true
  '--egl-wine-prefix'?: Path
  '--disable-sync'?: true
  '--egl-manifest-path'?: Path
  '--one-shot'?: true
  '--import-only'?: true
  '--export-only'?: true
  '--migrate'?: true
  '--unlink'?: true
}

export default EglSyncCommand
