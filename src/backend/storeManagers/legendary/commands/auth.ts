import { NonEmptyString } from './base'

interface AuthCommand {
  subcommand: 'auth'
  '--import'?: true
  '--code'?: NonEmptyString
  '--token'?: NonEmptyString
  '--sid'?: NonEmptyString
  '--delete'?: true
  '--disable-webview'?: true
}

export default AuthCommand
