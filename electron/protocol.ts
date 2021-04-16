import { LegendaryGame } from './games'

export async function handleProtocol(url : string) {
  const [command, args_string] = url.split('://')[1].split('?')
  const args = new Map<string, string>()
  args_string.split(',').forEach((arg) => {
    const [k, v] = arg.split('=')
    args.set(k, v)
  })
  console.log(`ProtocolHandler: received '${url}'`)
  if (command === 'ping') {
    return console.log('Received ping!', args)
  }
  if (command === 'launch') {
    return await LegendaryGame.get(args.get('appName')).launch()
  }
  if (command === 'install') {
    return await LegendaryGame.get(args.get('appName')).install(args.get('path'))
  }
}