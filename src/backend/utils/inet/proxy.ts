import http from 'node:http'
import https from 'node:https'
import axios from 'axios'

export const httpAgent = new http.Agent({
  keepAlive: true,
  proxyEnv: process.env
})
export const httpsAgent = new https.Agent({
  keepAlive: true,
  proxyEnv: process.env
})

export function initializeProxy(): void {
  // Configure fetch's dispatcher before installing the shared HTTP(S) agents.
  http.setGlobalProxyFromEnv()
  http.globalAgent = httpAgent
  https.globalAgent = httpsAgent
  axios.defaults.httpAgent = httpAgent
  axios.defaults.httpsAgent = httpsAgent
  // The shared agents handle proxy routing, so Axios must not rewrite requests.
  axios.defaults.proxy = false
}
