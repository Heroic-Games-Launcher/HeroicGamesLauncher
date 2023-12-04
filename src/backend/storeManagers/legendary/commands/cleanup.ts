interface CleanupCommand {
  subcommand: 'cleanup'
  '--keep-manifests'?: true
}

export default CleanupCommand
