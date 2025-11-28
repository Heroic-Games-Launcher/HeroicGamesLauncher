import { addHandler } from '../../ipc'
import { addRestPlugin, getRestPlugins, getRestPluginConfig } from './config'
import { refresh } from './library'

addHandler('addRestPlugin', async (_e, baseUrl: string) => {
  return await addRestPlugin(baseUrl)
})

addHandler('getRestPlugins', async () => {
  return getRestPlugins().map(id => ({
    id,
    config: getRestPluginConfig(id)
  }))
})

addHandler('refreshRestLibrary', async () => {
  return await refresh()
})

