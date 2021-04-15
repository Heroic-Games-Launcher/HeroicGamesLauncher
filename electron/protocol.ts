import { LegendaryGame } from './games'

export async function handleProtocol(command : string, args : string []) {
  if (command === 'ping') {
    return console.log('Received ping!', args)
  }
  if (command === 'launch') {
    return await LegendaryGame.get(args[0]).launch()
  }
  if (command === 'install') {
    return await LegendaryGame.get(args[0]).install(args[1])
  }
}