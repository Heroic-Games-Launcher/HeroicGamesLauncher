import { exec } from 'child_process'
import { existsSync } from 'graceful-fs'

const heroicImagesFolder = `${__dirname}/images`

export const getCover = (appName: string, type: string, url: string) => {
  const imagePath = `${heroicImagesFolder}/${appName}-${type}.png`
  const imageOffline = existsSync(imagePath)

  if (imageOffline) {
    return `images/${appName}-${type}.png`
  }

  url = url.replaceAll(' ', '%20')

  const downloadCommand = `curl -L '${url}' -o ${heroicImagesFolder}/${appName}-${type}.png`
  exec(downloadCommand)
  return `images/${appName}-${type}.png`
}
