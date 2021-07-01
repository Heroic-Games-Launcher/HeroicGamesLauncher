/* eslint-disable sort-keys-fix/sort-keys-fix */
/* eslint-disable @typescript-eslint/no-var-requires */
const axios = require('axios')
const {writeFileSync} = require('graceful-fs')
const api = 'https://api.github.com/repos/Heroic-Games-Launcher/HeroicGamesLauncher/releases'


async function getDownloadCount(){
  const {data} = await axios.get(api)
  const releases = data.map(rel => {
    const {name, assets} = rel
    const pkgs = assets.map(pkg => {
      const {name, download_count} = pkg
      return {pkg: name, downloads: download_count}
    })
    const sorted = pkgs.sort((a, b) => b.downloads - a.downloads)
    const total = pkgs.reduce((acc, pkg) => {
      return acc + pkg.downloads
    }, 0)
    return {name: name, pkgs: sorted, total: total}
  })
  const date = new Date()
  writeFileSync(`downloads-${date.getDate()}-${date.getMonth() + 1}.json`, JSON.stringify(releases, null, 2))
}

getDownloadCount()
