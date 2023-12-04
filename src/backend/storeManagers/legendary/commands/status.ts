interface StatusCommand {
  subcommand: 'status'
  '--offline'?: true
  '--json'?: true
}

export default StatusCommand
