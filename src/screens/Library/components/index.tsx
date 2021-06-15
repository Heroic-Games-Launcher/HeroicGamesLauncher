import { ipcRenderer } from 'electron/renderer'

export { default as GameCard } from './GameCard'

ipcRenderer.on('addGameToRecent', (e, args) => {
  const [appName] = args
  let recentGames: string[] = JSON.parse(localStorage.getItem('games.recent') as string)
  if (!recentGames) {
    recentGames = []
  }
  if (!recentGames.includes(appName)) {
    recentGames = [...recentGames, appName]
  } else {
    recentGames.forEach((val, index, arr) => {
      if (val === appName) {
        delete arr[index]
        recentGames = [...arr, arr[index]]
      }
    })
  }
  console.table(recentGames)
  localStorage.setItem('games.recent', JSON.stringify(recentGames))
})
